import mapTransform from 'map-transform'
import pLimit from 'p-limit'
import { ensureArray } from '../utils/array.js'
import { isObject, isOkResponse } from '../utils/is.js'
import {
  setDataOnActionPayload,
  setResponseOnAction,
  setOriginOnAction,
} from '../utils/action.js'
import { combineResponses, setOrigin } from '../utils/response.js'
import validateFilters from '../utils/validateFilters.js'
import prepareValidator from '../utils/validation.js'
import { populateActionAfterMutation } from '../utils/mutationHelpers.js'
import type {
  TransformObject,
  Pipeline,
  DataMapper,
  InitialState,
} from 'map-transform/types.js'
import type {
  Action,
  Response,
  Meta,
  HandlerDispatch,
  Condition,
  MapOptions,
  ValidateObject,
} from '../types.js'
import type { JobStepDef } from './types.js'

export const breakSymbol = Symbol('break')

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number]

interface Validator {
  (actionResponses: Record<string, Action>): Promise<[Response | null, boolean]>
}

export interface ResponsesObject extends Record<string, Action> {
  [breakSymbol]?: boolean
}

const adjustValidationResponse = ({
  break: _,
  message,
  ...response
}: Response & { message?: string; break?: boolean }) =>
  message
    ? isOkResponse(response)
      ? { ...response, warning: message }
      : { ...response, error: message }
    : response

function createPreconditionsValidator(
  conditions:
    | ValidateObject[]
    | Record<string, Condition | undefined>
    | undefined,
  mapOptions: MapOptions,
  prevStepId?: string,
): Validator {
  if (Array.isArray(conditions)) {
    const validator = prepareValidator(conditions, mapOptions, 'noaction')
    return async function validate(actionResponses) {
      const [responses, doBreak] = await validator(actionResponses)
      return [combineResponses(responses), doBreak]
    }
  } else if (isObject(conditions)) {
    const validator = validateFilters(conditions, true)
    return async function validate(actionResponses) {
      const responses = await validator(actionResponses)
      const doBreak = responses.some(({ break: doBreak }) => doBreak)

      return responses.length > 0
        ? [adjustValidationResponse(combineResponses(responses)), doBreak] // We only return the first error here
        : [null, false]
    }
  } else {
    return async function validatePrevWasOk(actionResponses) {
      const prevStep = prevStepId ? actionResponses[prevStepId] : undefined // eslint-disable-line security/detect-object-injection
      return [null, !!prevStep && !isOkResponse(prevStep.response)]
    }
  }
}

export function getLastJobWithResponse(
  steps: Step[],
  actionResponses: Record<string, Action>,
) {
  for (let i = steps.length - 1; i > -1; i--) {
    const step = steps.at(i) as Step // TS: We know this is a step
    // const ids = Array.isArray(step) ? step.map((f) => f.id) : [step.id]
    const actionResponse = actionResponses[step.id] || {}
    if (actionResponse.response?.status) {
      return actionResponse.response
    }
  }
  return undefined
}

const setResponseStatus = (response: Response = {}): Response => ({
  ...response,
  status: response.status ? response.status : response.error ? 'error' : 'ok',
})

const addModify = (mutation: ArrayElement<Pipeline>) =>
  isObject(mutation) ? { $modify: true, ...mutation } : mutation

// Insert `'$action'` as the first step in a pipeline to get the action we're
// mutating from.
const putMutationInPipeline = (
  mutation: TransformObject | Pipeline,
  useMagic: boolean,
) =>
  Array.isArray(mutation)
    ? ['$action', ...mutation.map(addModify)]
    : useMagic
    ? ['$action', { '.': '.', ...mutation }]
    : ['$action', addModify(mutation)]

async function mutateAction(
  action: Action,
  mutator: DataMapper<InitialState> | undefined,
  actionsWithResponses: Record<string, Action>,
): Promise<Action> {
  if (mutator) {
    const responsesIncludingAction = {
      ...actionsWithResponses,
      $action: action,
    }
    return (await mutator(responsesIncludingAction)) as Action
  } else {
    return action
  }
}

export async function mutateResponse(
  action: Action,
  responses: Record<string, Action>,
  origin: string,
  postmutator?: DataMapper<InitialState>,
): Promise<Action> {
  const { response: mutatedResponse } = await mutateAction(
    action,
    postmutator,
    responses,
  )
  return setOriginOnAction(
    populateActionAfterMutation(
      action,
      setResponseOnAction(action, setResponseStatus(mutatedResponse)),
    ),
    origin,
  )
}

function responseFromSteps(
  actionResponses: Record<string, Action>,
): Action | undefined {
  const errorResponses = Object.values(actionResponses)
    .map(({ response }) => response)
    .filter((response): response is Response => !isOkResponse(response))
  if (errorResponses.length === 0) {
    return { response: { status: 'ok' } } as Action // Allow an action with only a response here
  } else {
    return {
      response: {
        status: 'error',
        responses: errorResponses,
      },
    } as Action // Allow an action with only a response here
  }
}

function generateIterateResponse(
  action: Action,
  actionsWithResponses: Action[],
) {
  const errorResponses = actionsWithResponses
    .map(({ response }) => response)
    .filter(
      (response): response is Response => !!response && !isOkResponse(response),
    )
  const status = errorResponses.length === 0 ? 'ok' : 'error'
  const error = errorResponses
    .map((response) =>
      response ? `[${response.status}] ${response.error}` : undefined,
    )
    .filter(Boolean)
    .join(' | ')
  const data = actionsWithResponses.flatMap(({ response }) => response?.data)
  return setResponseOnAction(action, {
    status,
    data,
    ...(error && { error, responses: errorResponses }),
  })
}

export const prepareMutation = (
  pipeline: TransformObject | Pipeline,
  mapOptions: MapOptions,
  useMagic = false,
) => mapTransform(putMutationInPipeline(pipeline, useMagic), mapOptions)

function getIterateMutator(step: JobStepDef, mapOptions: MapOptions) {
  const pipeline = step.iterate || step.iteratePath
  if (pipeline) {
    return mapTransform(pipeline, mapOptions)
  } else {
    return undefined
  }
}

const prepareAction = (action: Action, meta: Meta) => ({
  ...action,
  meta: {
    ...meta,
    ...(action.meta?.queue ?? meta?.queue ? { queue: true } : {}),
  },
})

export function getPrevStepId(
  index: number,
  steps: (JobStepDef | JobStepDef[])[],
) {
  const prevStep = index > 0 ? steps[index - 1] : undefined
  return Array.isArray(prevStep)
    ? prevStep
        .map((step) => step?.id)
        .filter(Boolean)
        .join(':')
    : prevStep?.id
}

// Run the action for every item in the `payload.data` array
async function runIteration(
  items: unknown[],
  action: Action,
  id: string,
  concurrency: number,
  runOneAction: (action: Action) => Promise<Action>,
) {
  const actions = items.map((item) => setDataOnActionPayload(action, item))
  const limit = pLimit(concurrency)
  return Object.fromEntries(
    (
      await Promise.all(
        actions.map((action) => limit(() => runOneAction(action))),
      )
    ).map((response, index) => [
      `${id}_${index}`,
      setOriginOnAction(response, `${id}_${index}`),
    ]), // Set the id of each response as key for the object to be created
  )
}

// Run all sub steps in parallel
async function runSubSteps(
  subSteps: Step[],
  id: string,
  actionResponses: Record<string, Action>,
  dispatch: HandlerDispatch,
  meta: Meta,
) {
  // TODO: Actually run all parallel steps, even if one fails
  const arrayOfResponses = await Promise.all(
    subSteps.map((step) => step.run(meta, actionResponses, dispatch)),
  )
  const doBreak = arrayOfResponses.some(
    (response) => response[breakSymbol], // eslint-disable-line security/detect-object-injection
  )
  const responsesObj = Object.fromEntries(
    arrayOfResponses.flatMap((responses) => Object.entries(responses)),
  )
  const thisStep = responseFromSteps(responsesObj)
  return thisStep
    ? { ...responsesObj, [id]: thisStep, [breakSymbol]: doBreak }
    : { ...responsesObj, [breakSymbol]: doBreak }
}

export default class Step {
  id: string
  #action?: Action
  #subSteps?: Step[]
  #validatePreconditions: Validator = async () => [null, false]
  #premutator?: DataMapper<InitialState>
  #postmutator?: DataMapper<InitialState>
  #iterateMutator?: DataMapper<InitialState>
  #iterateConcurrency?: number

  constructor(
    stepDef: JobStepDef | JobStepDef[],
    mapOptions: MapOptions,
    prevStepId?: string,
  ) {
    if (Array.isArray(stepDef)) {
      this.id = stepDef.map((step) => step.id).join(':')
      this.#subSteps = stepDef.map(
        (step, index, steps) =>
          new Step(step, mapOptions, getPrevStepId(index, steps)),
      )
    } else {
      this.id = stepDef.id
      this.#validatePreconditions = createPreconditionsValidator(
        stepDef.preconditions ?? stepDef.conditions,
        mapOptions,
        prevStepId,
      )
      this.#action = stepDef.action
      const premutation = stepDef.premutation || stepDef.mutation
      const postmutation = stepDef.postmutation || stepDef.responseMutation
      this.#premutator = premutation
        ? prepareMutation(premutation, mapOptions, !!stepDef.mutation) // Set a flag for `mutation`, to signal that we want to use the obsolete "magic"
        : undefined
      this.#postmutator = postmutation
        ? prepareMutation(postmutation, mapOptions, !!stepDef.responseMutation) // Set a flag for `responseMutation`, to signal that we want to use the obsolete "magic"
        : undefined
      this.#iterateMutator = getIterateMutator(stepDef, mapOptions)
      this.#iterateConcurrency = stepDef.iterateConcurrency
    }
  }

  runAction(
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
    meta: Meta,
  ): (rawAction: Action) => Promise<Action> {
    return async (rawAction) => {
      const action = prepareAction(
        await mutateAction(rawAction, this.#premutator, actionResponses),
        meta,
      )

      let response
      try {
        response = await dispatch(action)
      } catch (error) {
        response = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        }
      }
      return setResponseOnAction(action, response)
    }
  }

  /**
   * Runs this step.
   */
  async run(
    meta: Meta,
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
  ): Promise<ResponsesObject> {
    // First, check if the step validates. Break if not.
    const [validateResponse, doBreak] =
      await this.#validatePreconditions(actionResponses)
    if (validateResponse || doBreak) {
      return {
        [this.id]: {
          response: setOrigin(validateResponse || {}, this.id),
        } as Action, // Allow an action with only a response here
        [breakSymbol]: doBreak,
      }
    }

    // Validated, so let's run ...
    const action = this.#action
    if (action) {
      // We have an action
      const runOneAction = this.runAction(actionResponses, dispatch, meta)
      let responses: ResponsesObject = {}
      let responseAction: Action
      if (this.#iterateMutator) {
        // Run the action once for each item in the `payload.data` array
        const items = ensureArray(await this.#iterateMutator(actionResponses))
        responses = await runIteration(
          items,
          action,
          this.id,
          this.#iterateConcurrency || Infinity,
          runOneAction,
        )
        responseAction = generateIterateResponse(
          action,
          Object.values(responses), // Combine the responses from all iterations
        )
      } else {
        // Simply run the action
        responseAction = await runOneAction(action)
      }
      return {
        ...responses,
        [this.id]: await mutateResponse(
          responseAction,
          actionResponses,
          this.id,
          this.#postmutator,
        ),
      }
    } else if (this.#subSteps) {
      // We have sub steps, so run these steps in parallel
      return await runSubSteps(
        this.#subSteps,
        this.id,
        actionResponses,
        dispatch,
        meta,
      )
    } else {
      return {}
    }
  }
}
