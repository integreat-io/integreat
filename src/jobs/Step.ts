import mapTransform from 'map-transform'
import { ensureArray } from '../utils/array.js'
import { isErrorResponse, isObject, isOkResponse } from '../utils/is.js'
import {
  setDataOnActionPayload,
  setResponseOnAction,
  setOrigin,
} from '../utils/action.js'
import validateFilters from '../utils/validateFilters.js'
import prepareValidator from '../utils/validation.js'
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

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType[number]

interface Validator {
  (actionResponses: Record<string, Action>): Promise<[Response | null, boolean]>
}

function combineResponses(responses: Response[]) {
  if (responses.length < 2) {
    return responses[0] // Will yield undefined if no responses
  } else {
    const error = responses
      .filter((response) => response.error || isErrorResponse(response))
      .map((response) => `[${response.status}] ${response.error}`)
      .join(' | ')
    const warning = responses
      .filter((response) => response.warning)
      .map((response) => response.warning)
      .join(' | ')
    return {
      status: 'error',
      ...(error && { error }),
      ...(warning && { warning }),
    }
  }
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
  prevStepId?: string
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
  actionResponses: Record<string, Action>
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

const cleanUpResponse = (
  response: Response | undefined,
  origin: string
): Response =>
  response
    ? setOrigin(
        {
          ...response,
          status:
            (response.status === 'ok' || !response.status) && response.error
              ? 'error'
              : response.status || 'ok',
          ...(response.error && {
            error: Array.isArray(response.error)
              ? response.error.join(' | ')
              : response.error,
          }),
        },
        String(origin)
      )
    : { status: 'ok' }

const addModify = (mutation: ArrayElement<Pipeline>) =>
  isObject(mutation) ? { $modify: true, ...mutation } : mutation

// Insert `'$action'` as the first step in a pipeline to get the action we're
// mutating from.
const putMutationInPipeline = (
  mutation: TransformObject | Pipeline,
  useMagic: boolean
) =>
  Array.isArray(mutation)
    ? ['$action', ...mutation.map(addModify)]
    : useMagic
    ? ['$action', { '.': '.', ...mutation }]
    : ['$action', addModify(mutation)]

async function mutateAction(
  action: Action,
  mutator: DataMapper<InitialState> | undefined,
  actionsWithResponses: Record<string, Action>
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
  origin: string,
  response: Response,
  responses: Record<string, Action>,
  postmutator?: DataMapper<InitialState>
): Promise<Action> {
  const { response: mutatedResponse } = await mutateAction(
    setResponseOnAction(action, response),
    postmutator,
    responses
  )
  return setResponseOnAction(action, cleanUpResponse(mutatedResponse, origin))
}

function responseFromSteps(
  actionResponses: Record<string, Action>
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

function generateIterateResponse(actionsWithResponses: Action[]) {
  const errorResponses = actionsWithResponses
    .map(({ response }) => response)
    .filter((response) => response && !isOkResponse(response))
  const status = errorResponses.length === 0 ? 'ok' : 'error'
  const error = errorResponses
    .map((response) =>
      response ? `[${response.status}] ${response.error}` : undefined
    )
    .filter(Boolean)
    .join(' | ')
  const data = actionsWithResponses.flatMap(({ response }) => response?.data)
  return {
    response: {
      status,
      data,
      ...(error && { error, responses: errorResponses }),
    },
  } as Action // We're okay with this action having only a response
}

export const prepareMutation = (
  pipeline: TransformObject | Pipeline,
  mapOptions: MapOptions,
  useMagic = false
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
  steps: (JobStepDef | JobStepDef[])[]
) {
  const prevStep = index > 0 ? steps[index - 1] : undefined
  return Array.isArray(prevStep)
    ? prevStep
        .map((step) => step?.id)
        .filter(Boolean)
        .join(':')
    : prevStep?.id
}

export default class Step {
  id: string
  #action?: Action
  #subSteps?: Step[]
  #validatePreconditions: Validator = async () => [null, false]
  #premutator?: DataMapper<InitialState>
  #postmutator?: DataMapper<InitialState>
  #iterateMutator?: DataMapper<InitialState>

  constructor(
    stepDef: JobStepDef | JobStepDef[],
    mapOptions: MapOptions,
    prevStepId?: string
  ) {
    if (Array.isArray(stepDef)) {
      this.id = stepDef.map((step) => step.id).join(':')
      this.#subSteps = stepDef.map(
        (step, index, steps) =>
          new Step(step, mapOptions, getPrevStepId(index, steps))
      )
    } else {
      this.id = stepDef.id
      this.#validatePreconditions = createPreconditionsValidator(
        stepDef.preconditions ?? stepDef.conditions,
        mapOptions,
        prevStepId
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
    }
  }

  async runAction(
    rawAction: Action,
    idIndex: number | undefined,
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch,
    meta: Meta
  ): Promise<[Record<string, Action>, boolean]> {
    const action = prepareAction(
      await mutateAction(rawAction, this.#premutator, actionResponses),
      meta
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
    const stepId =
      typeof idIndex === 'number' ? `${this.id}_${idIndex}` : this.id
    return [
      {
        [stepId]: await mutateResponse(
          action,
          stepId, // Used as origin
          response,
          actionResponses,
          this.#postmutator
        ),
      },
      false,
    ]
  }

  async run(
    meta: Meta,
    actionResponses: Record<string, Action>,
    dispatch: HandlerDispatch
  ): Promise<[Record<string, Action>, boolean]> {
    const [validateResponse, doBreak] = await this.#validatePreconditions(
      actionResponses
    )
    if (validateResponse || doBreak) {
      return [
        {
          [this.id]: {
            response: setOrigin(validateResponse || {}, this.id),
          } as Action, // Allow an action with only a response here
        },
        doBreak,
      ]
    }

    let arrayOfStepResponses: [Record<string, Action>, boolean][]
    const action = this.#action
    if (action) {
      let actions
      if (this.#iterateMutator) {
        const items = ensureArray(await this.#iterateMutator(actionResponses))
        actions = items.map((item) => setDataOnActionPayload(action, item))
      } else {
        actions = [action]
      }
      arrayOfStepResponses = await Promise.all(
        actions.map(
          async (action, index) =>
            await this.runAction(
              action,
              actions.length === 1 ? undefined : index,
              actionResponses,
              dispatch,
              meta
            )
        )
      )
    } else if (this.#subSteps) {
      // TODO: Actually run all parallel steps, even if one fails
      arrayOfStepResponses = await Promise.all(
        this.#subSteps.map((step) => step.run(meta, actionResponses, dispatch))
      )
    } else {
      return [{}, false]
    }

    const stepResponses = arrayOfStepResponses.reduce(
      (allResponses, [stepResponses]) => ({
        ...allResponses,
        ...stepResponses,
      }),
      {}
    )
    const thisStep = this.#subSteps
      ? responseFromSteps(stepResponses)
      : this.#iterateMutator
      ? generateIterateResponse(Object.values(stepResponses))
      : undefined

    return [
      thisStep ? { ...stepResponses, [this.id]: thisStep } : stepResponses,
      arrayOfStepResponses.some(([_, doBreak]) => doBreak),
    ]
  }
}
