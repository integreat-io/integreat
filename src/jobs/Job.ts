import { nanoid } from 'nanoid'
import Schedule from './Schedule.js'
import Step, {
  createPreconditionsValidator,
  statusFromResponses,
  getPrevStepId,
  getLastJobWithResponse,
  prepareMutation,
  mutateResponse,
  breakSymbol,
  Validator,
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

const messageFromResponse = (response: Response) =>
  response.error || response.warning || 'Unknown error'

const messageFromStep = (isFlow: boolean) => (response: Response) => {
  return isErrorResponse(response) || response.warning
    ? isFlow
      ? `- '${response.origin}': ${messageFromResponse(response)} (${response.status})`
      : `- ${messageFromResponse(response)} (${response.status})`
    : undefined
}

function generateJobMessage(
  responses: Response[],
  jobId: string,
  isFlow: boolean,
  isOk: boolean,
) {
  if (responses.length > 1) {
    const stepMessage = responses
      .map(messageFromStep(isFlow))
      .filter(Boolean)
      .join('\n')
    return isOk
      ? `Message from steps:\n${stepMessage}`
      : isFlow
        ? `Steps failed:\n${stepMessage}`
        : `Could not finish job '${jobId}': ${stepMessage}`
  } else {
    return !isOk || responses[0].warning
      ? messageFromResponse(responses[0])
      : undefined
  }
}

const removeOriginAndWarning = ({ origin, warning, ...response }: Response) =>
  response

const setOriginOnResponses = (responses: Response[], jobId: string) =>
  responses.map((response) => setOrigin(response, `job:${jobId}:step`, true))

function setMessageAndOrigin(
  response: Response,
  jobId: string,
  isFlow: boolean,
): Response {
  const responses = response.responses || [response]
  const isOk = isOkResponse(response)
  const bareResponse = removeOriginAndWarning(response)

  if (isOk) {
    // We have an ok response
    const warningResponses = responses.filter((resp) => resp.warning)
    const jobWarning =
      warningResponses.length > 0
        ? generateJobMessage(warningResponses, jobId, isFlow, isOk)
        : undefined
    return {
      ...bareResponse,
      ...(jobWarning ? { warning: jobWarning } : {}),
      ...(response.responses
        ? { responses: setOriginOnResponses(response.responses, jobId) }
        : {}),
    }
  } else {
    // We have an error response
    const errorResponses = responses.filter(isErrorResponse)
    const jobError =
      errorResponses.length > 0
        ? generateJobMessage(errorResponses, jobId, isFlow, isOk)
        : undefined
    return {
      ...bareResponse,
      status: statusFromResponses(responses),
      error: jobError,
      origin: `job:${jobId}`,
      responses: setOriginOnResponses(responses, jobId),
    }
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
  #validatePreconditions: Validator = async () => [null, false]
  #postmutator?: DataMapper<InitialState>
  #isFlow = false

  constructor(
    jobDef: JobDef,
    mapTransform: MapTransform,
    mapOptions: MapOptions,
    failOnErrorInPostconditions = false,
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
              failOnErrorInPostconditions,
              getPrevStepId(index, steps),
            ),
        )

      // We only set the preconditions and the postmutator when we have a flow.
      this.#validatePreconditions = createPreconditionsValidator(
        jobDef.preconditions,
        undefined,
        mapTransform,
        mapOptions,
        failOnErrorInPostconditions,
        undefined,
      )
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
          jobDef,
          mapTransform,
          mapOptions,
          failOnErrorInPostconditions,
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

    const [preconditionsResponse] =
      await this.#validatePreconditions(actionResponses)

    if (!preconditionsResponse) {
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
    }

    const response =
      preconditionsResponse ??
      getResponse(this.id, this.#steps, actionResponses, this.#isFlow)

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
