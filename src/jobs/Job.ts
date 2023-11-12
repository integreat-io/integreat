import { nanoid } from 'nanoid'
import Schedule from './Schedule.js'
import Step, {
  getPrevStepId,
  getLastJobWithResponse,
  prepareMutation,
  mutateResponse,
  breakSymbol,
} from './Step.js'
import { isObject, isOkResponse, isErrorResponse } from '../utils/is.js'
import { setResponseOnAction } from '../utils/action.js'
import { setOrigin } from '../utils/response.js'
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
  isObject(job) && isObject(job.action)

const generateSubMeta = ({ ident, project, cid }: Meta, jobId: string) => ({
  ident,
  jobId,
  ...(project ? { project } : {}),
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
  isFlow: boolean,
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
          setOrigin(response, `job:${jobId}:step`, true),
        ),
        origin: `job:${jobId}`,
      }
}

function getResponse(
  jobId: string,
  steps: Step[],
  responses: Record<string, Action>,
  isFlow: boolean,
): Response {
  const lastResponse = getLastJobWithResponse(steps, responses)
  if (!lastResponse) {
    return { status: 'noaction' }
  } else {
    return setMessageAndOrigin(lastResponse, jobId, isFlow)
  }
}

const getId = (jobDef: JobDef) =>
  typeof jobDef.id === 'string' && jobDef.id ? jobDef.id : nanoid()

const removePostmutationAndSetId = (
  { postmutation, responseMutation, ...job }: JobStepDef,
  id: string,
) => ({ ...job, id })

export default class Job {
  id: string
  schedule?: Schedule
  #steps: Step[] = []
  #postmutator?: DataMapper<InitialState>
  #isFlow = false

  constructor(jobDef: JobDef, mapOptions: MapOptions) {
    this.id = getId(jobDef)

    if (Array.isArray(jobDef.flow)) {
      this.#isFlow = true
      this.#steps = jobDef.flow
        .filter(
          (step): step is JobStepDef | JobStepDef[] =>
            Array.isArray(step) || isJobStep(step),
        )
        .map(
          (stepDef, index, steps) =>
            new Step(stepDef, mapOptions, getPrevStepId(index, steps)),
        )
    } else if (isJobStep(jobDef)) {
      this.#steps = [
        new Step(removePostmutationAndSetId(jobDef, this.id), mapOptions),
      ] // We'll run the post mutation here when this is a job with an action only
    }
    const postmutation = jobDef.postmutation || jobDef.responseMutation
    this.#postmutator = postmutation
      ? prepareMutation(postmutation, mapOptions, !!jobDef.responseMutation) // Set a flag for `responseMutation`, to signal that we want to use the obsolete "magic"
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
      const { [breakSymbol]: doBreak, ...responses } = await step.run(
        meta,
        actionResponses,
        dispatch,
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
      this.#isFlow,
    )
    actionResponses = { ...actionResponses, action: { ...action, response } }

    if (this.#postmutator) {
      const { response: mutatedResponse } = await mutateResponse(
        setResponseOnAction(action, response),
        actionResponses,
        `job:${this.id}`,
        this.#postmutator,
      )
      return mutatedResponse || response
    } else {
      return response
    }
  }
}
