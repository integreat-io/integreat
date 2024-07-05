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
  MapTransform,
  MapOptions,
  SetProgress,
} from '../types.js'
import type { JobDef, JobStepDef, JobDefWithFlow } from './types.js'

const isActionJob = (job: unknown): job is JobStepDef =>
  isObject(job) && isObject(job.action)

const isFlowJob = (job: unknown): job is JobDefWithFlow =>
  isObject(job) && Array.isArray(job.flow)

const generateSubMeta = (
  { ident, project, cid }: Meta,
  jobId: string,
  gid?: string,
) => ({
  ident,
  jobId,
  ...(project ? { project } : {}),
  ...(cid ? { cid } : {}),
  ...(gid ? { gid } : {}),
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

const calculateProgress = (index: number, stepsCount: number) =>
  (index + 1) / (stepsCount + 1)

export default class Job {
  id: string
  schedule?: Schedule
  #steps: Step[] = []
  #postmutator?: DataMapper<InitialState>
  #isFlow = false

  constructor(
    jobDef: JobDef,
    mapTransform: MapTransform,
    mapOptions: MapOptions,
    breakByDefault = false,
  ) {
    this.id = getId(jobDef)

    if (isFlowJob(jobDef)) {
      this.#isFlow = true
      this.#steps = jobDef.flow
        .filter(
          (step): step is JobStepDef | JobStepDef[] =>
            Array.isArray(step) || isActionJob(step),
        )
        .map(
          (stepDef, index, steps) =>
            new Step(
              stepDef,
              mapTransform,
              mapOptions,
              breakByDefault,
              getPrevStepId(index, steps),
            ),
        )

      // We only set the postmutator when we have a flow.
      const postmutation = jobDef.postmutation || jobDef.responseMutation
      this.#postmutator = postmutation
        ? prepareMutation(
            postmutation,
            mapTransform,
            mapOptions,
            !!jobDef.responseMutation,
          ) // Set a flag for `responseMutation`, to signal that we want to use the obsolete "magic"
        : undefined
    } else if (isActionJob(jobDef)) {
      this.#steps = [
        new Step(
          { ...jobDef, id: jobDef.id },
          mapTransform,
          mapOptions,
          breakByDefault,
          undefined,
          true, // Signal that this is a job (not a step in a flow)
        ),
      ]
      // We don't set the postmutator here for action jobs, as it is
      // handled in the job step instead.
    }

    if (jobDef.cron && this.#steps.length > 0) {
      this.schedule = new Schedule(jobDef)
    }
  }

  async run(
    action: Action,
    dispatch: HandlerDispatch,
    setProgress: SetProgress,
    gid?: string,
  ): Promise<Response> {
    if (this.#steps.length === 0) {
      return {
        status: 'noaction',
        warning: `Job '${this.id}' has no action or flow`,
        origin: `job:${this.id}`,
      }
    }

    let actionResponses: Record<string, Action> = { action } // Include the incoming action in previous responses, to allow mutating from it
    const meta = generateSubMeta(action.meta || {}, this.id, gid)

    for (const [index, step] of this.#steps.entries()) {
      const { [breakSymbol]: doBreak, ...responses } = await step.run(
        meta,
        actionResponses,
        dispatch,
      )
      setProgress(calculateProgress(index, this.#steps.length))
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

    if (this.#postmutator) {
      // Note that only a job with a flow will have postmutator. For
      // a job with an action, the post mutation is passed on to the
      // step logic.
      actionResponses = { ...actionResponses, action: { ...action, response } }
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
