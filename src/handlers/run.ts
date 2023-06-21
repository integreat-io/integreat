/* eslint-disable security/detect-object-injection */
import mapTransform from 'map-transform'
import pLimit from 'p-limit'
import { ensureArray } from '../utils/array.js'
import validateFilters from '../utils/validateFilters.js'
import {
  setResponseOnAction,
  setDataOnActionPayload,
  createErrorResponse,
  setOrigin,
} from '../utils/action.js'
import {
  isJob,
  isJobStep,
  isJobWithAction,
  isJobWithFlow,
  isObject,
} from '../utils/is.js'
import type {
  TransformDefinition,
  TransformObject,
  Pipeline,
} from 'map-transform/types.js'
import type {
  Action,
  ActionHandlerResources,
  HandlerDispatch,
  Meta,
  Payload as BasePayload,
  Response,
  Job,
  JobDef,
  ConditionFailObject,
  JobWithAction,
} from '../types.js'
import type { MapOptions } from '../service/types.js'

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number]

export interface Payload extends BasePayload {
  jobId?: string
}

const generateSubMeta = (
  { ident, project, queue, cid }: Meta,
  jobId: string
) => ({
  ident,
  jobId,
  ...(project ? { project } : {}),
  ...(queue ? { queue } : {}),
  ...(cid ? { cid } : {}),
})

const prepareAction = (action: Action, meta: Meta) => ({
  ...action,
  meta: {
    ...meta,
    ...(action.meta?.queue ?? meta?.queue ? { queue: true } : {}),
  },
})

const isOkResponse = (response?: Response) =>
  typeof response?.status === 'string' &&
  ['ok', 'noaction', 'queued'].includes(response.status)

const addModify = (mutation: ArrayElement<Pipeline>) =>
  isObject(mutation) ? { $modify: true, ...mutation } : mutation

// TODO: Prepare mutations in `../create.ts` and call a `mutate()` function here
function mutateAction(
  action: Action,
  mutation: TransformObject | Pipeline | undefined,
  actionsWithResponses: Record<string, Action>,
  mapOptions: MapOptions
): Action {
  if (mutation) {
    const mutationIncludingAction = Array.isArray(mutation)
      ? ['$action', ...mutation.map(addModify)]
      : ['$action', { '.': '.', ...mutation }] // $action is the action we're mutating to
    const responsesIncludingAction = {
      ...actionsWithResponses,
      $action: action,
    }
    return mapTransform(
      mutationIncludingAction,
      mapOptions
    )(responsesIncludingAction) as Action
  } else {
    return action
  }
}

async function runAction(
  action: Action | undefined,
  dispatch: HandlerDispatch,
  meta: Meta
) {
  if (action) {
    return await dispatch(prepareAction(action, meta))
  } else {
    return { status: 'noaction' }
  }
}

const prependResponseError = (
  response: Response | undefined,
  message: string
) =>
  response?.error
    ? { ...response, error: `${message}${response.error}` }
    : response

const errorMessageFromResponses = (
  actionsWithResponses: Action[],
  ids: string[]
) =>
  actionsWithResponses
    .map(({ response }, index) =>
      response?.error
        ? `'${ids[index]}' (${response?.status}: ${response?.error})`
        : undefined
    )
    .filter(Boolean)
    .join(', ')

const removeError = ({ error, ...response }: Response) => response

function responseFromActionWithResponses(
  actions: Action[],
  ids: string[]
): Response {
  if (actions.length === 1 && actions[0]) {
    const action = actions[0]
    const status = isOkResponse(action.response) ? 'ok' : 'error'
    const message = errorMessageFromResponses(actions, ids)
    return {
      ...removeError(action.response || {}),
      status,
      ...(message
        ? status === 'ok'
          ? { warning: `Message from steps: ${message}` }
          : { error: message }
        : {}),
      ...(status === 'error'
        ? {
            responses: actions
              .map(({ response }) => response)
              .filter(Boolean) as Response[],
          }
        : {}),
    }
  }

  const errorResponses = actions
    .map(({ response }) => response)
    .filter((response) => response && !isOkResponse(response)) as Response[]
  const message = errorMessageFromResponses(actions, ids)

  if (errorResponses.length > 0) {
    return {
      status: 'error',
      error: message,
      responses: errorResponses,
    }
  } else {
    return {
      status: 'ok',
      ...(message ? { warning: `Message from steps: ${message}` } : {}),
    }
  }
}

function getLastJobWithResponse(
  flow: (Job | Job[])[],
  actionsWithResponses: Record<string, Action>
) {
  for (let i = flow.length - 1; i > -1; i--) {
    const step = flow[i]
    const ids = Array.isArray(step) ? step.map((f) => f.id) : [step.id]
    if (ids.some((id) => actionsWithResponses[id])) {
      return responseFromActionWithResponses(
        ids.map((id) => actionsWithResponses[id]),
        ids
      )
    }
  }
  return undefined
}

const setResponses = (
  source: Record<string, Action>,
  target: Record<string, Action>
) =>
  Object.entries(source).forEach(([key, value]) => {
    target[key] = value
  })

const setStepError = (
  stepId: string,
  error: string,
  status = 'error'
): Record<string, Action> => ({
  [stepId]: {
    response: { status, error },
  } as Action, // Allow partial action in this case
})

function isStepOk(
  steps: Job | Job[], // One step may consist of several steps
  responses: Record<string, Action>
) {
  if (Array.isArray(steps)) {
    return steps.every((step) => isOkResponse(responses[step.id]?.response))
  } else {
    return isOkResponse(responses[steps.id]?.response)
  }
}

const messageFromValidationErrors = (vals: ConditionFailObject[]) =>
  vals
    .map((val) => val.message)
    .filter(Boolean)
    .join(' | ')

function statusFromValidationErrors(vals: ConditionFailObject[]) {
  const statuses = vals.map((val) => val.status).filter(Boolean)
  return statuses.length === 0 ? undefined : statuses[0]
}

const getIteratePipeline = (
  step: JobWithAction
): TransformDefinition | undefined => step.iterate || step.iteratePath

function unpackIterationSteps(
  step: Job,
  actionsWithResponses: Record<string, Action>,
  mapOptions: MapOptions
): Job {
  if (!isJobWithAction(step)) {
    return step
  }
  const iteratePipeline = getIteratePipeline(step)
  if (!iteratePipeline) {
    return step
  }

  const getter = mapTransform(iteratePipeline, mapOptions)
  const items = ensureArray(getter(actionsWithResponses))

  return {
    id: step.id,
    flow: items.map((item, index) => ({
      id: `${step.id}_${index}`,
      action: setDataOnActionPayload(step.action, item),
      mutation: step.mutation,
    })),
    responseMutation: step.responseMutation,
  }
}

function generateIterateResponse(actionsWithResponses: Action[]) {
  const errorResponses = actionsWithResponses
    .map(({ response }) => response)
    .filter((response) => response && !isOkResponse(response))
  const status = errorResponses.length === 0 ? 'ok' : 'error'
  const error = errorResponses
    .map((response) =>
      response ? `[${response.status}] ${response.error}` : undefined
    )
    .filter(Boolean)
    .join(' | ')
  const data = actionsWithResponses.flatMap(({ response }) => response?.data)
  return {
    response: {
      status,
      data,
      ...(error && { error }),
    },
  } as Action // We're okay with this action having only a response
}

async function runStep(
  step: Job,
  allResponses: Record<string, Action>,
  ourResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta: Meta,
  prevStep?: Job | Job[]
): Promise<boolean> {
  // Check if conditions are met
  if (step.conditions) {
    // Validate specific conditions
    const validationErrors = validateFilters(
      step.conditions,
      true
    )(allResponses)
    if (validationErrors.length > 0) {
      const response = setStepError(
        step.id,
        messageFromValidationErrors(validationErrors),
        statusFromValidationErrors(validationErrors)
      )
      setResponses(response, ourResponses)
      return validationErrors.some((val) => val.break)
    }
  } else if (prevStep) {
    // No conditions are specified -- validate the status of the previous step
    if (!isStepOk(prevStep, allResponses)) {
      return false
    }
  }

  try {
    const job = unpackIterationSteps(step, allResponses, mapOptions)
    if (isJobWithAction(job)) {
      // We have reached an action -- run it
      const action = mutateAction(
        job.action,
        job.mutation,
        allResponses,
        mapOptions
      )
      const response = await runAction(action, dispatch, meta)
      setResponses(
        {
          [job.id]: setResponseOnAction(
            action,
            mutateResponse(action, response, job, allResponses, mapOptions)
          ),
        },
        ourResponses
      )
    } else {
      // This is a job with a flow -- run flow
      const stepResponses = await runFlow(
        job,
        allResponses,
        dispatch,
        mapOptions,
        meta
      )
      if (isJobWithAction(step) && isJobWithFlow(job)) {
        // This was originally a job with an action that was unpacked to a flow,
        // so gather all responses and set an aggregated response
        stepResponses[step.id] = generateIterateResponse(
          Object.values(stepResponses)
        )
      }
      setResponses(stepResponses, ourResponses)
    }
  } catch (error) {
    setResponses(
      setStepError(
        step.id,
        error instanceof Error ? error.message : String(error),
        'rejected'
      ),
      ourResponses
    )
  }

  return false
}

function getFlowResponse(
  job: Job,
  actionsWithResponses: Record<string, Action>
): Response {
  if (isJobWithFlow(job)) {
    const lastResponse = getLastJobWithResponse(job.flow, actionsWithResponses)
    return (
      prependResponseError(
        lastResponse,
        `Could not finish job '${job.id}', the following steps failed: `
      ) || { status: 'noaction' }
    )
  } else {
    const response = actionsWithResponses[job.id]
    return response?.response || { status: 'noaction' }
  }
}

const cleanUpResponse = (response?: Response): Response =>
  response
    ? setOrigin(
        {
          ...response,
          status:
            (response.status === 'ok' || !response.status) && response.error
              ? 'error'
              : response.status || 'ok',
          ...(response.error && {
            error: Array.isArray(response.error)
              ? response.error.join(' | ')
              : response.error,
          }),
        },
        'handler:RUN'
      )
    : { status: 'ok' }

function mutateResponse(
  action: Action,
  response: Response,
  job: Job,
  responses: Record<string, Action>,
  mapOptions: MapOptions
): Response {
  const { response: mutatedResponse } = mutateAction(
    setResponseOnAction(action, response),
    (job as JobDef).responseMutation, // Type hack, as Job is missing some of JobDef's props
    responses,
    mapOptions
  )
  return cleanUpResponse(mutatedResponse)
}

async function runFlow(
  job: Job,
  prevResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta: Meta
): Promise<Record<string, Action>> {
  const ourResponses: Record<string, Action> = {}
  if (isJobWithFlow(job)) {
    // We have sequence of job steps – go through them one by one, until we're
    // through or any of them returns `true` (doBreak)
    let doBreak = false
    let index = 0
    do {
      const steps = job.flow[index]
      const allResponses = { ...prevResponses, ...ourResponses }
      const prevStep = index > 0 ? job.flow[index - 1] : undefined

      if (isJobStep(steps)) {
        // A single step
        // Note: `runStep()` will mutate `newResponses` as it runs
        doBreak = await runStep(
          steps,
          allResponses,
          ourResponses,
          dispatch,
          mapOptions,
          meta,
          prevStep
        )
      } else if (Array.isArray(steps)) {
        // An array of steps within a sequence – run them in parallel
        // Note that it is okay to use `Promise.all` here, as rejections are
        // handled in `runStep()`
        const parallelResponses: Record<string, Action> = {}
        doBreak = (
          await Promise.all(
            steps.map((step) =>
              pLimit(1)(() =>
                // Note: `runStep()` will mutate `arrayResponses` as it runs
                runStep(
                  step,
                  allResponses,
                  parallelResponses,
                  dispatch,
                  mapOptions,
                  meta,
                  prevStep
                )
              )
            )
          )
        ).includes(true) // Return `true` if any of the steps returns `true`
        setResponses(parallelResponses, ourResponses)
      }
    } while (++index < job.flow.length && !doBreak)
  } else if (isJobWithAction(job)) {
    // We've got one action – run it
    // Note: `runStep()` will mutate `newResponses` as it runs
    await runStep(job, prevResponses, ourResponses, dispatch, mapOptions, meta)
  }

  return ourResponses
}

export default (jobs: Record<string, JobDef>, mapOptions: MapOptions) =>
  async function run(
    action: Action<Payload>,
    { dispatch }: ActionHandlerResources
  ): Promise<Response> {
    const {
      payload: { jobId },
      meta,
    } = action
    const job = typeof jobId === 'string' ? jobs[jobId] : undefined
    if (!isJob(job)) {
      return createErrorResponse(
        `No valid job with id '${jobId}'`,
        'handler:RUN',
        'notfound'
      )
    }

    const prevResponses = { action } // Include the incoming action in previous responses, to allow mutating from it
    const responses = await runFlow(
      job,
      prevResponses,
      dispatch,
      mapOptions,
      generateSubMeta(meta || {}, jobId as string)
    )

    const response = getFlowResponse(job, responses)

    if (isJobWithAction(job)) {
      return cleanUpResponse(response) // The response has alreay been mutated
    } else {
      return mutateResponse(
        action,
        response,
        job,
        { ...responses, action: setResponseOnAction(action, response) }, // TODO: Is this necessary?
        mapOptions
      ) // Mutate response
    }
  }
