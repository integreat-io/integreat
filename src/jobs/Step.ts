import mapTransform from 'map-transform'
import pLimit from 'p-limit'
import { ensureArray } from '../utils/array.js'
import { isObject, isOkResponse } from '../utils/is.js'
import xor from '../utils/xor.js'
import {
  setDataOnActionPayload,
  setResponseOnAction,
  setOriginOnAction,
  setErrorOnAction,
  setMetaOnAction,
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

const adjustPrevalidationResponse = ({
  break: _,
  message,
  ...response
}: Response & { message?: string; break?: boolean }) =>
  message
    ? isOkResponse(response)
      ? { ...response, warning: message }
      : { ...response, error: message }
    : response

const setOkStatusOnErrorResponse = ({
  error,
  origin,
  ...response
}: Response = {}) => ({
  ...response,
  status: 'ok',
  ...(error ? { warning: error } : {}), // Turn an error into a warning
})

const ensureOkResponse = (response?: Response): Response =>
  isOkResponse(response) ? response! : setOkStatusOnErrorResponse(response)

const adjustValidationResponse = (
  responses: Response[],
  response: Response | undefined,
) =>
  responses.length > 0
    ? combineResponses(responses) // One or more conditions failed, so we'll return the combined response
    : response
    ? ensureOkResponse(response) // Always return an ok response when we have a response (only happens for postconditions)
    : null

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

const putMutationInPipelineForCondition = (
  conditionObject: ValidateObject,
): ValidateObject => ({
  ...conditionObject,
  condition: Array.isArray(conditionObject.condition)
    ? ['$action', ...conditionObject.condition]
    : conditionObject.condition
    ? ['$action', conditionObject.condition]
    : null,
})

const getThisResponse = (actionResponses: Record<string, Action>) =>
  actionResponses.$action?.response

const getPreviousResponse = (
  actionResponses: Record<string, Action>,
  prevStepId?: string,
) => (prevStepId ? actionResponses[prevStepId]?.response : undefined) // eslint-disable-line security/detect-object-injection

function createConditionsValidator(
  conditions:
    | ValidateObject[]
    | Record<string, Condition | undefined>
    | undefined,
  mapOptions: MapOptions,
  isPreconditions: boolean,
  breakByDefault: boolean,
  prevStepId?: string,
): Validator {
  if (Array.isArray(conditions)) {
    // Validate condition pipelines
    const defaultFailStatus = isPreconditions ? 'noaction' : 'error'
    const validator = prepareValidator(
      conditions,
      mapOptions,
      defaultFailStatus,
      breakByDefault,
    )
    return async function validate(actionResponses) {
      const [responses, doBreak] = await validator(actionResponses)
      const stepResponse = getThisResponse(actionResponses)
      const response = adjustValidationResponse(responses, stepResponse)
      return [response, doBreak]
    }
  } else if (isObject(conditions)) {
    // Validate through filters. Only used for prevalidations. Will be deprecated
    const validator = validateFilters(conditions, true)
    return async function validate(actionResponses) {
      const responses = validator(actionResponses)
      const doBreak = responses.some(
        ({ break: doBreak = breakByDefault }) => doBreak,
      )

      return responses.length > 0
        ? [adjustPrevalidationResponse(combineResponses(responses)), doBreak] // We only return the first error here
        : [null, false]
    }
  } else if (xor(isPreconditions, breakByDefault)) {
    // We're using xor to check for not `isPreconditions` when `breakByDefault` is `true`
    // We have no conditions, so we'll just check if this or the previous step was ok (the former when `breakByDefault` is `true`)
    return async function validatePrevWasOk(actionResponses) {
      const response = breakByDefault
        ? getThisResponse(actionResponses)
        : getPreviousResponse(actionResponses, prevStepId)
      return response && !isOkResponse(response)
        ? [response, true]
        : [null, false]
    }
  } else {
    // Is postconditions and no conditions, so we'll always return ok
    return async function validateAlwaysOk(_actionResponses) {
      return [null, false]
    }
  }
}

function createPreconditionsValidator(
  preconditions: ValidateObject[] | undefined,
  validationFilters: Record<string, Condition | undefined> | undefined,
  mapOptions: MapOptions,
  breakByDefault: boolean,
  prevStepId?: string,
): Validator {
  const conditions = preconditions || validationFilters
  return createConditionsValidator(
    conditions,
    mapOptions,
    true,
    breakByDefault,
    prevStepId,
  )
}

function createPostconditionsValidator(
  conditions: ValidateObject[] | undefined,
  mapOptions: MapOptions,
  breakByDefault: boolean,
): Validator {
  if (Array.isArray(conditions)) {
    conditions = conditions.map(putMutationInPipelineForCondition)
  }
  return createConditionsValidator(
    conditions,
    mapOptions,
    false,
    breakByDefault,
  )
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

function generateIterateResponse(action: Action, responses: ResponsesObject) {
  const actionsWithResponses = Object.values(responses)
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

async function runOneAction(action: Action, dispatch: HandlerDispatch) {
  try {
    return setResponseOnAction(action, await dispatch(action))
  } catch (error) {
    return setErrorOnAction(action, error)
  }
}

export default class Step {
  id: string
  #action?: Action
  #subSteps?: Step[]
  #validatePreconditions: Validator = async () => [null, false]
  #validatePostconditions: Validator = async () => [null, false]
  #premutator?: DataMapper<InitialState>
  #postmutator?: DataMapper<InitialState>
  #iterateMutator?: DataMapper<InitialState>
  #iterateConcurrency?: number

  constructor(
    stepDef: JobStepDef | JobStepDef[],
    mapOptions: MapOptions,
    breakByDefault = false,
    prevStepId?: string,
  ) {
    if (Array.isArray(stepDef)) {
      this.id = stepDef.map((step) => step.id).join(':')
      this.#subSteps = stepDef.map(
        (step, index, steps) =>
          new Step(
            step,
            mapOptions,
            breakByDefault,
            getPrevStepId(index, steps),
          ),
      )
    } else {
      this.id = stepDef.id
      this.#validatePreconditions = createPreconditionsValidator(
        stepDef.preconditions,
        stepDef.conditions,
        mapOptions,
        breakByDefault,
        prevStepId,
      )
      this.#validatePostconditions = createPostconditionsValidator(
        stepDef.postconditions,
        mapOptions,
        breakByDefault,
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

  /**
   * Run the given action for every item in the items array.
   */
  async runIteration(
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
    meta: Meta,
  ) {
    if (!this.#iterateMutator || !this.#action) {
      return undefined // Return undefined when there's no iterate mutator or action
    }
    const action = setMetaOnAction(this.#action, meta)

    const items = ensureArray(await this.#iterateMutator(actionResponses))
    const actions = items.map((item) => setDataOnActionPayload(action, item))
    const limit = pLimit(this.#iterateConcurrency ?? 1)

    return Object.fromEntries(
      (
        await Promise.all(
          actions.map((action) =>
            limit(async () =>
              runOneAction(
                await mutateAction(action, this.#premutator, actionResponses),
                dispatch,
              ),
            ),
          ),
        )
      ).map((response, index) => [
        `${this.id}_${index}`, // Set the id of each response as key for the object to be created
        setOriginOnAction(response, `${this.id}_${index}`),
      ]),
    )
  }

  /**
   * Run the action for this step.
   */
  async runAction(
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
    meta: Meta,
  ): Promise<ResponsesObject> {
    if (!this.#action) {
      return {} // No action, return empty response object
    }
    const action = setMetaOnAction(this.#action, meta)

    // Run the action for every item in the array return by the iterate mutator.
    const responses = await this.runIteration(actionResponses, dispatch, meta)

    // If we got any responses, combine them into one response. Otherwise
    // just run the action, as no responses means there were no iterate mutator,
    // so nothing has been run yet.
    const responseAction = responses
      ? generateIterateResponse(action, responses)
      : await runOneAction(
          await mutateAction(action, this.#premutator, actionResponses),
          dispatch,
        )

    // Mutate the response and return together with any individual responses
    return {
      ...responses,
      [this.id]: await mutateResponse(
        responseAction,
        actionResponses,
        this.id,
        this.#postmutator,
      ),
    }
  }

  /**
   *  Run all sub steps in parallel.
   */
  async runSubSteps(
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
    meta: Meta,
  ) {
    if (!this.#subSteps) {
      return {} // No sub steps, return empty response object
    }

    // TODO: Actually run all parallel steps, even if one fails
    const arrayOfResponses = await Promise.all(
      this.#subSteps.map((step) => step.run(meta, actionResponses, dispatch)),
    )
    const doBreak = arrayOfResponses.some(
      (response) => response[breakSymbol], // eslint-disable-line security/detect-object-injection
    )
    const responsesObj = Object.fromEntries(
      arrayOfResponses.flatMap((responses) => Object.entries(responses)),
    )
    const thisStep = responseFromSteps(responsesObj)
    return thisStep
      ? { ...responsesObj, [this.id]: thisStep, [breakSymbol]: doBreak }
      : { ...responsesObj, [breakSymbol]: doBreak }
  }

  /**
   * Run this step.
   */
  async run(
    meta: Meta,
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
  ): Promise<ResponsesObject> {
    // First, check if the step preconditions are met. Break if configured to.
    const [preconditionsResponse, doPreBreak] =
      await this.#validatePreconditions(actionResponses)
    if (preconditionsResponse || doPreBreak) {
      return {
        [this.id]: {
          response: setOrigin(preconditionsResponse || {}, this.id),
        } as Action, // Allow an action with only a response here
        [breakSymbol]: doPreBreak,
      }
    }

    // Validated, so let's run the action or sub steps
    const responseObject: ResponsesObject = this.#action
      ? await this.runAction(actionResponses, dispatch, meta)
      : await this.runSubSteps(actionResponses, dispatch, meta)
    const thisActionResponse = responseObject[this.id] // This is the action with response for this step

    // Finally, check if the step postconditions are met. Break if configured to.
    const [postconditionsResponse, doPostBreak] =
      await this.#validatePostconditions({
        ...actionResponses,
        $action: thisActionResponse,
      })
    if (postconditionsResponse || doPostBreak) {
      return {
        ...responseObject,
        [this.id]: setResponseOnAction(
          thisActionResponse,
          setOrigin(postconditionsResponse || {}, this.id),
        ),
        [breakSymbol]: doPostBreak,
      }
    }

    // No post conditions, so return the action response object
    return responseObject
  }
}
