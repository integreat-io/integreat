import Schedule from './Schedule.js'
import Step, {
  getPrevStepId,
  getLastJobWithResponse,
  prepareMutation,
  mutateResponse,
} from './Step.js'
import { isObject, isOkResponse, isErrorResponse } from '../utils/is.js'
import { setOrigin } from '../utils/action.js'
import type { DataMapper, InitialState } from 'map-transform/types.js'
import type {
  Action,
  Response,
  Meta,
  HandlerDispatch,
  MapOptions,
} from '../types.js'
import type { JobDef, JobStepDef } from './types.js'

const isJobStep = (job: unknown): job is JobStepDef =>
  isObject(job) && typeof job.id === 'string' && isObject(job.action)

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

const messageFromStep = (isFlow: boolean) => (response: Response) => {
  const message = response.error || response.warning || 'Unknown error'
  return isErrorResponse(response) || response.warning
    ? isFlow
      ? `'${response.origin}' (${response.status}: ${message})`
      : `[${response.status}] ${message}`
    : undefined
}

const removeOriginAndWarning = ({ origin, warning, ...response }: Response) =>
  response

function setMessageAndOrigin(
  response: Response,
  jobId: string,
  isFlow: boolean
): Response {
  const responses = response.responses || [response]
  const stepMessages = responses
    .map(messageFromStep(isFlow))
    .filter(Boolean)
    .join(', ')
  return isOkResponse(response)
    ? {
        ...removeOriginAndWarning(response),
        status: 'ok',
        ...(stepMessages
          ? { warning: `Message from steps: ${stepMessages}` }
          : {}),
      }
    : {
        ...removeOriginAndWarning(response),
        status: isOkResponse(response) ? 'ok' : 'error',
        error: isFlow
          ? `Could not finish job '${jobId}', the following steps failed: ${stepMessages}`
          : `Could not finish job '${jobId}': ${stepMessages}`,
        responses: responses.map((response) =>
          setOrigin(response, `job:${jobId}:step`, true)
        ),
        origin: `job:${jobId}`,
      }
}

function getResponse(
  jobId: string,
  steps: Step[],
  responses: Record<string, Action>,
  isFlow: boolean
): Response {
  const lastResponse = getLastJobWithResponse(steps, responses)
  if (!lastResponse) {
    return { status: 'noaction' }
  } else {
    return setMessageAndOrigin(lastResponse, jobId, isFlow)
  }
}

const removePostMutation = ({ responseMutation, ...job }: JobStepDef) => job

export default class Job {
  id: string
  schedule?: Schedule
  #steps: Step[] = []
  #postmutator?: DataMapper<InitialState>
  #isFlow = false

  constructor(jobDef: JobDef, mapOptions: MapOptions) {
    this.id = jobDef.id || ''

    if (Array.isArray(jobDef.flow)) {
      this.#isFlow = true
      this.#steps = jobDef.flow
        .filter(
          (step): step is JobStepDef | JobStepDef[] =>
            Array.isArray(step) || isJobStep(step)
        )
        .map(
          (stepDef, index, steps) =>
            new Step(stepDef, mapOptions, getPrevStepId(index, steps))
        )
    } else if (isJobStep(jobDef)) {
      this.#steps = [new Step(removePostMutation(jobDef), mapOptions)] // We'll run the post mutation here when this is a job with an action only
    }
    this.#postmutator = jobDef.responseMutation
      ? prepareMutation(jobDef.responseMutation, mapOptions)
      : undefined

    if (jobDef.cron && this.#steps.length > 0) {
      this.schedule = new Schedule(jobDef)
    }
  }

  async run(action: Action, dispatch: HandlerDispatch): Promise<Response> {
    if (this.#steps.length === 0) {
      return {
        status: 'noaction',
        warning: `Job '${this.id}' has no action or flow`,
        origin: `job:${this.id}`,
      }
    }

    let actionResponses: Record<string, Action> = { action } // Include the incoming action in previous responses, to allow mutating from it
    const meta = generateSubMeta(action.meta || {}, this.id)

    for (const step of this.#steps) {
      const [responses, doBreak] = await step.run(
        meta,
        actionResponses,
        dispatch
      )
      actionResponses = { ...actionResponses, ...responses }
      if (doBreak) {
        break
      }
    }

    const response = getResponse(
      this.id,
      this.#steps,
      actionResponses,
      this.#isFlow
    )
    actionResponses = { ...actionResponses, action: { ...action, response } }

    if (this.#postmutator) {
      const { response: mutatedResponse } = await mutateResponse(
        action,
        `job:${this.id}`,
        response,
        actionResponses,
        this.#postmutator
      )
      return mutatedResponse || response
    } else {
      return response
    }
  }
}
