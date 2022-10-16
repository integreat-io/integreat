/* eslint-disable security/detect-object-injection */
import { mapTransform, MapObject, MapPipe } from 'map-transform'
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
  meta,
})

const isOkResponse = (response?: Response) =>
  typeof response?.status === 'string' &&
  ['ok', 'noaction'].includes(response.status)

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
      : { '.': '$action', ...mutation } // $action is the action we're mutation to
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

async function runStep(
  step: Job,
  responses: Record<string, Action>,
  newResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta?: Meta,
  prevStep?: Job | Job[]
) {
  let response: Record<string, Action> | undefined

  // Check if conditions are met
  if (step.conditions) {
    // Validate specific conditions
    const validationErrors = validateFilters(step.conditions, true)(responses)
    if (validationErrors.length > 0) {
      response = setStepError(
        step.id,
        messageFromValidationErrors(validationErrors),
        statusFromValidationErrors(validationErrors)
      )
    }
  } else if (prevStep) {
    // No conditions are specified -- validate the status of the previous step
    if (!isStepOk(prevStep, responses)) {
      response = newResponses
    }
  }

  if (!response) {
    try {
      response = await runFlow(step, responses, dispatch, mapOptions, meta)
    } catch (error) {
      response = setStepError(
        step.id,
        error instanceof Error ? error.message : String(error),
        'rejected'
      )
    }
  }

  setResponses(response, newResponses)
  return response
}

const isJobWithIteratePath = (step: unknown): step is JobWithAction =>
  isJobStep(step) && typeof (step as JobWithAction).iteratePath === 'string'

const setData = (action: Action, data: unknown) => ({
  ...action,
  payload: { ...action.payload, data },
})

function unpackIterationSteps(
  step: Job | Job[],
  responses: Record<string, Action>,
  mapOptions: MapOptions
) {
  if (!isJobWithIteratePath(step)) {
    return step
  }

  const getter = mapTransform(step.iteratePath as string, mapOptions) // We know this is a string
  const items = ensureArray(getter(responses))

  return items.map((data, index) => ({
    ...step,
    id: `${step.id}_${index}`,
    action: setData(step.action, data),
  }))
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
    const newResponses: Record<string, Action> = {}
    for (const [index, rawStep] of flow.entries()) {
      const responses = { ...prevResponses, ...newResponses }
      const prevStep = index > 0 ? flow[index - 1] : undefined

      const step = unpackIterationSteps(rawStep, responses, mapOptions)

      if (isJobStep(step)) {
        // A single step
        // Note: `runStep()` will mutate `newResponses` as it runs
        await runStep(
          step,
          responses,
          newResponses,
          dispatch,
          mapOptions,
          meta,
          prevStep
        )
      } else if (Array.isArray(step)) {
        // An array of steps within a sequence – run them in parallel
        // Note that it is okay to use `Promise.all` here, as rejections are
        // handled in `runStep()`
        await Promise.all(
          step.map((step) =>
            // Note: `runStep()` will mutate `newResponses` as it runs
            runStep(
              step,
              responses,
              newResponses,
              dispatch,
              mapOptions,
              meta,
              prevStep
            )
          )
        )
      }
    }
    return newResponses
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

    return mutateResponse(
      {
        ...action,
        response: getFlowResponse(job, responses),
      },
      job,
      responses,
      mapOptions
    )

    // const actionWithResponse = {
    //   ...action,
    //   response: getFlowResponse(job, responses),
    // }
    // return cleanUpResponse(
    //   mutateAction(
    //     actionWithResponse,
    //     (job as JobDef).responseMutation, // Type hack, as Job is missing some of JobDef's props
    //     { ...responses, action: actionWithResponse },
    //     mapOptions
    //   )
    // )
  }
