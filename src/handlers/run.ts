/* eslint-disable security/detect-object-injection */
import { MapDefinition } from 'map-transform'
import {
  Action,
  ActionHandlerResources,
  HandlerDispatch,
  Meta,
  Payload as BasePayload,
  Response,
} from '../types'
import { createErrorOnAction } from '../utils/createError'
import { isObject } from '../utils/is'

export interface JobStep {
  id: string
  action?: Action | (JobStep | JobStep[])[]
  mutation?: MapDefinition
}

export interface Job {
  id: string
  action: Action | (JobStep | JobStep[])[]
}

export interface Payload extends BasePayload {
  jobId?: string
}

const isJobStep = (step: unknown): step is JobStep =>
  isObject(step) && typeof step.id === 'string'

const prepareAction = (action: Action, meta?: Meta) => ({
  ...action,
  meta,
})

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
      response.response?.status === 'ok' ? undefined : index
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

async function runFlow(
  flow: Action | (JobStep | JobStep[])[] | undefined,
  parentId: string,
  dispatch: HandlerDispatch,
  meta?: Meta
): Promise<Record<string, Action>> {
  if (Array.isArray(flow)) {
    // We have sequence of job steps – go through them one by one
    const responses = {}
    for (const step of flow) {
      if (isJobStep(step)) {
        // One step in a sequence – run it
        const response = await runFlow(step.action, step.id, dispatch, meta)
        setResponses(response, responses)
        if (response[step.id].response?.status !== 'ok') {
          return responses
        }
      } else if (Array.isArray(step)) {
        // An array of steps within a sequence – run them in parallel
        const ret = await Promise.all(
          // TODO: Is Promise.all correct here? I think not ...
          step.map((step) => runFlow(step.action, step.id, dispatch, meta))
        )
        ret.forEach((response) => {
          setResponses(response, responses)
        })
      }
    }
    return responses
  } else if (flow) {
    // We've got one action – run it
    return { [parentId]: await runAction(flow, dispatch, meta) }
  }
  return {}
}

export default (jobs: Job[]) =>
  async function set(
    action: Action,
    { dispatch }: ActionHandlerResources
  ): Promise<Action> {
    const {
      payload: { jobId },
      meta,
    } = action
    const job = jobs.find((job) => job.id === jobId)
    if (!job) {
      return createErrorOnAction(
        action,
        `No job with id '${jobId}'`,
        'notfound'
      )
    }

    const responses = await runFlow(job.action, job.id, dispatch, meta)

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
