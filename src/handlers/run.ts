/* eslint-disable security/detect-object-injection */
import { mapTransform, MapObject } from 'map-transform'
import {
  Action,
  ActionHandlerResources,
  HandlerDispatch,
  Meta,
  Payload as BasePayload,
  Response,
  JobStep,
  Job,
} from '../types'
import { MapOptions } from '../service/types'
import { createErrorOnAction } from '../utils/createError'
import { isObject, isAction } from '../utils/is'
import validateFilters from '../utils/validateFilters'

export interface Payload extends BasePayload {
  jobId?: string
}

const isJobStep = (step: unknown): step is JobStep =>
  isObject(step) && typeof step.id === 'string'

const prepareAction = (action: Action, meta?: Meta) => ({
  ...action,
  meta,
})

const isOkResponse = (response?: Response) =>
  typeof response?.status === 'string' &&
  ['ok', 'noaction'].includes(response.status)

// TODO: Prepare mutations in `../create.ts` and call a `mutate()` function here
function mutateAction(
  action: Action | (JobStep | JobStep[])[] | undefined,
  mutation: MapObject | undefined,
  responses: Record<string, Action>,
  mapOptions: MapOptions
) {
  if (mutation && isAction(action)) {
    const mutationIncludingAction = { '.': '$action', ...mutation } // $action is the action we're mutation to
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

const errorMessageFromResponses = (
  indices: number[],
  responses: Action[],
  ids: string[]
) =>
  indices
    .map(
      (index) =>
        `'${ids[index]}' (${responses[index].response?.status}: ${responses[index].response?.error})`
    )
    .join(', ')

function responseFromResponses(responses: Action[], ids: string[]) {
  const errorIndices = responses
    .map((response, index) =>
      isOkResponse(response.response) ? undefined : index
    )
    .filter((index): index is number => index !== undefined)
  return {
    response:
      errorIndices.length > 0
        ? {
            status: 'error',
            error: errorMessageFromResponses(errorIndices, responses, ids),
          }
        : { status: 'ok' },
  } as Action
}

function getLastJobWithResponse(
  flow: (JobStep | JobStep[])[],
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

async function runStep(
  step: JobStep,
  responses: Record<string, Action>,
  newResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta?: Meta
) {
  const response = await runFlow(step, responses, dispatch, mapOptions, meta)
  setResponses(response, newResponses)
  return response
}

const setConditionError = (
  step: JobStep,
  responses: Record<string, Action>
) => ({
  ...responses,
  [step.id]: {
    response: { status: 'error', error: 'Conditions were not met' },
  } as Action, // Allow a partial action in this case
})

function isStepOk(
  steps: JobStep | JobStep[], // One step may consist of several steps
  responses: Record<string, Action>
) {
  if (Array.isArray(steps)) {
    return steps.every((step) => isOkResponse(responses[step.id]?.response))
  } else {
    return isOkResponse(responses[steps.id]?.response)
  }
}

async function runFlow(
  job: JobStep,
  prevResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  mapOptions: MapOptions,
  meta?: Meta
): Promise<Record<string, Action>> {
  const { action, id: parentId, mutation } = job
  if (Array.isArray(action)) {
    // We have sequence of job steps – go through them one by one
    const newResponses = {}
    for (const [index, step] of action.entries()) {
      const responses = { ...prevResponses, ...newResponses }
      if (isJobStep(step)) {
        // One step in a sequence – run it if conditions are met
        if (step.conditions) {
          // Validate specific conditions
          if (!validateFilters(step.conditions)(responses)) {
            return setConditionError(step, newResponses)
          }
        } else if (index > 0) {
          // No conditions are specified -- validate the status of the previous step
          const prevStep = action[index - 1]
          if (!isStepOk(prevStep, responses)) {
            return newResponses
          }
        }

        // Note: `runStep()` will mutate `newResponses` as it runs
        await runStep(step, responses, newResponses, dispatch, mapOptions, meta)
      } else if (Array.isArray(step)) {
        // An array of steps within a sequence – run them in parallel
        await Promise.all(
          // TODO: Is Promise.all correct here? I think not ...
          step.map((step) =>
            // Note: `runStep()` will mutate `newResponses` as it runs
            runStep(step, responses, newResponses, dispatch, mapOptions, meta)
          )
        )
      }
    }
    return newResponses
  } else if (action && parentId) {
    // We've got one action – run it
    return {
      [parentId]: await runAction(
        mutateAction(action, mutation, prevResponses, mapOptions),
        dispatch,
        meta
      ),
    }
  }
  return {}
}

export default (jobs: Record<string, Job>, mapOptions: MapOptions) =>
  async function run(
    action: Action,
    { dispatch }: ActionHandlerResources
  ): Promise<Action> {
    const {
      payload: { jobId },
      meta,
    } = action
    const job = typeof jobId === 'string' ? jobs[jobId] : undefined
    if (!isJobStep(job)) {
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

    if (Array.isArray(job.action)) {
      const lastResponse = getLastJobWithResponse(job.action, responses)
      return {
        ...action,
        response: prependResponseError(
          lastResponse?.response,
          `Could not finish job '${job.id}', the following steps failed: `
        ) || { status: 'noaction' },
      }
    } else {
      const response = responses[job.id]
      return {
        ...action,
        response: response.response,
      }
    }
  }
