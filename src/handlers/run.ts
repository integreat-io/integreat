/* eslint-disable security/detect-object-injection */
import { mapTransform, MapObject, MapPipe } from 'map-transform'
import pLimit = require('p-limit')
import {
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
} from '../types'
import { MapOptions } from '../service/types'
import { createErrorOnAction } from '../utils/createError'
import {
  isJob,
  isJobStep,
  isJobWithAction,
  isJobWithFlow,
  isAction,
  isObject,
} from '../utils/is'
import { ensureArray } from '../utils/array'
import validateFilters from '../utils/validateFilters'

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number]

export interface Payload extends BasePayload {
  jobId?: string
}

const prepareAction = (action: Action, meta?: Meta) => ({
  ...action,
  meta: {
    ...meta,
    ...(action.meta?.queue ?? meta?.queue ? { queue: true } : {}),
  },
})

const isOkResponse = (response?: Response) =>
  typeof response?.status === 'string' &&
  ['ok', 'noaction', 'queued'].includes(response.status)

const addModify = (mutation: ArrayElement<MapPipe>) =>
  isObject(mutation) ? { $modify: true, ...mutation } : mutation

// TODO: Prepare mutations in `../create.ts` and call a `mutate()` function here
function mutateAction(
  action: Action | (Job | Job[])[] | undefined,
  mutation: MapObject | MapPipe | undefined,
  responses: Record<string, Action>,
  mapOptions: MapOptions
) {
  if (mutation && isAction(action)) {
    const mutationIncludingAction = Array.isArray(mutation)
      ? ['$action', ...mutation.map(addModify)]
      : ['$action', { '.': '.', ...mutation }] // $action is the action we're mutating to
    const responsesIncludingAction = { ...responses, $action: action }
    return mapTransform(
      mutationIncludingAction,
      mapOptions
    )(responsesIncludingAction)
  }
  return action
}

async function runAction(
  action: Action | undefined,
  dispatch: HandlerDispatch,
  meta?: Meta
) {
  if (action) {
    return await dispatch(prepareAction(action, meta))
  } else {
    return { response: { status: 'noaction' } } as Action
  }
}

const prependResponseError = (
  response: Response | undefined,
  message: string
) =>
  response?.error
    ? { ...response, error: `${message}${response.error}` }
    : response

const errorMessageFromResponses = (responses: Action[], ids: string[]) =>
  responses
    .map((response, index) =>
      response.response?.error
        ? `'${ids[index]}' (${response.response?.status}: ${response.response?.error})`
        : undefined
    )
    .filter(Boolean)
    .join(', ')

function responseFromResponses(responses: Action[], ids: string[]) {
  const errorIndices = responses
    .map((response, index) =>
      isOkResponse(response?.response) ? undefined : index
    )
    .filter((index): index is number => index !== undefined)
  const message = errorMessageFromResponses(responses, ids)
  return {
    response:
      errorIndices.length > 0
        ? {
            status: 'error',
            error: message,
          }
        : message
        ? { status: 'ok', warning: `Message from steps: ${message}` }
        : { status: 'ok' },
  } as Action
}

function getLastJobWithResponse(
  flow: (Job | Job[])[],
  responses: Record<string, Action>
) {
  for (let i = flow.length - 1; i > -1; i--) {
    const step = flow[i]
    const ids = Array.isArray(step) ? step.map((f) => f.id) : [step.id]
    if (ids.some((id) => responses[id])) {
      return responseFromResponses(
        ids.map((id) => responses[id]),
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
  if (statuses.length === 0) {
    return undefined
  }
  return statuses[0]
}

const isStepWithIteratePath = (step: unknown): step is JobWithAction =>
  isJobStep(step) && typeof (step as JobWithAction).iteratePath === 'string'

const setData = (action: Action, data: unknown): Action => ({
  ...action,
  payload: { ...action.payload, data },
})

function unpackIterationSteps(
  step: Job,
  responses: Record<string, Action>,
  mapOptions: MapOptions
): Job {
  if (!isStepWithIteratePath(step)) {
    return step
  }

  const getter = mapTransform(step.iteratePath as string, mapOptions) // We know this is a string
  const items = ensureArray(getter(responses))

  return {
    id: step.id,
    flow: items.map((data, index) => ({
      id: `${step.id}_${index}`,
      action: setData(step.action, data),
      mutation: step.mutation,
    })),
    responseMutation: step.responseMutation,
  }
}

async function runStep(
  step: Job,
  allResponses: Record<string, Action>,
  flowResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta?: Meta,
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
      setResponses(response, flowResponses)
      return validationErrors.some((val) => val.break)
    }
  } else if (prevStep) {
    // No conditions are specified -- validate the status of the previous step
    if (!isStepOk(prevStep, allResponses)) {
      return false
    }
  }

  let ourResponses: Record<string, Action> | undefined
  try {
    const unpackedStep = unpackIterationSteps(step, allResponses, mapOptions)
    ourResponses = await runFlow(
      unpackedStep,
      allResponses,
      dispatch,
      mapOptions,
      meta
    )
    if (isJobWithAction(step) && isJobWithFlow(unpackedStep)) {
      ourResponses[step.id] = {
        response: {
          status: 'ok',
          data: Object.values(ourResponses).map((resp) => resp.response?.data),
        },
      } as Action // We're okay with this action having only a response
    }
  } catch (error) {
    ourResponses = setStepError(
      step.id,
      error instanceof Error ? error.message : String(error),
      'rejected'
    )
  }

  setResponses(ourResponses, flowResponses)
  return false
}

function getFlowResponse(job: Job, responses: Record<string, Action>) {
  if (isJobWithFlow(job)) {
    const lastResponse = getLastJobWithResponse(job.flow, responses)
    return (
      prependResponseError(
        lastResponse?.response,
        `Could not finish job '${job.id}', the following steps failed: `
      ) || { status: 'noaction' }
    )
  } else {
    const response = responses[job.id]
    return response?.response
  }
}

const cleanUpResponse = (action: Action) => ({
  ...action,
  response: {
    ...action.response,
    status:
      (action.response?.status === 'ok' || !action.response?.status) &&
      action.response?.error
        ? 'error'
        : action.response?.status || 'ok',
    ...(action.response?.error && {
      error: Array.isArray(action.response.error)
        ? action.response.error.join(' | ')
        : action.response.error,
    }),
  },
})

function mutateResponse(
  action: Action,
  job: Job,
  responses: Record<string, Action>,
  mapOptions: MapOptions
) {
  return cleanUpResponse(
    mutateAction(
      action,
      (job as JobDef).responseMutation, // Type hack, as Job is missing some of JobDef's props
      { ...responses, action },
      mapOptions
    )
  )
}

async function runFlow(
  job: Job,
  prevResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta?: Meta
): Promise<Record<string, Action>> {
  const { id: parentId, mutation } = job
  if (isJobWithFlow(job)) {
    // We have sequence of job steps – go through them one by one
    const flow = job.flow
    const flowResponses: Record<string, Action> = {}
    for (const [index, steps] of flow.entries()) {
      const responses = { ...prevResponses, ...flowResponses }
      const prevStep = index > 0 ? flow[index - 1] : undefined

      if (isJobStep(steps)) {
        // A single step
        // Note: `runStep()` will mutate `newResponses` as it runs
        const doBreak = await runStep(
          steps,
          responses,
          flowResponses,
          dispatch,
          mapOptions,
          meta,
          prevStep
        )
        // Break if step returned true
        if (doBreak) {
          return flowResponses
        }
      } else if (Array.isArray(steps)) {
        const parallelResponses: Record<string, Action> = {}

        // An array of steps within a sequence – run them in parallel
        // Note that it is okay to use `Promise.all` here, as rejections are
        // handled in `runStep()`
        const doBreak = await Promise.all(
          steps.map((step) =>
            pLimit(1)(() =>
              // Note: `runStep()` will mutate `arrayResponses` as it runs
              runStep(
                step,
                responses,
                parallelResponses,
                dispatch,
                mapOptions,
                meta,
                prevStep
              )
            )
          )
        )
        setResponses(parallelResponses, flowResponses)

        // Break if any of the steps returned true
        if (doBreak.includes(true)) {
          return flowResponses
        }
      }
    }
    // Flow completed - return responses
    return flowResponses
  } else if (isJobWithAction(job) && parentId) {
    // We've got one action – run it
    const action = mutateAction(job.action, mutation, prevResponses, mapOptions)
    const response = await runAction(action, dispatch, meta)
    return {
      [parentId]: mutateResponse(
        { ...action, response: response.response },
        job,
        prevResponses,
        mapOptions
      ),
    }
  }
  return {}
}

export default (jobs: Record<string, JobDef>, mapOptions: MapOptions) =>
  async function run(
    action: Action,
    { dispatch }: ActionHandlerResources
  ): Promise<Action> {
    const {
      payload: { jobId },
      meta,
    } = action
    const job = typeof jobId === 'string' ? jobs[jobId] : undefined
    if (!isJob(job)) {
      return createErrorOnAction(
        action,
        `No job with id '${jobId}'`,
        'notfound'
      )
    }

    const prevResponses = { action } // Include the incoming action in previous responses, to allow mutating from it
    const responses = await runFlow(
      job,
      prevResponses,
      dispatch,
      mapOptions,
      meta
    )

    const responseAction = {
      ...action,
      response: getFlowResponse(job, responses),
    }
    return isJobWithAction(job)
      ? cleanUpResponse(responseAction) // The response has alreay been mutated
      : mutateResponse(responseAction, job, responses, mapOptions) // Mutate response
  }
