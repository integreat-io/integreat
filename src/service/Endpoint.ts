/* eslint-disable security/detect-object-injection */
import compareEndpoints from './utils/compareEndpoints.js'
import isEndpointMatch from './utils/isEndpointMatch.js'
import { populateActionAfterMutation } from '../utils/mutationHelpers.js'
import { ensureArray } from '../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../utils/is.js'
import { combineResponses, setOrigin } from '../utils/response.js'
import prepareValidator, { ResponsesAndBreak } from '../utils/validation.js'
import type { DataMapper, InitialState } from 'map-transform/types.js'
import type { TransformDefinition } from 'map-transform/typesNext.js'
import type Auth from './Auth.js'
import type {
  Action,
  Response,
  Adapter,
  MapOptions,
  MapTransform,
} from '../types.js'
import type {
  EndpointDef,
  ServiceOptions,
  MatchObject,
  PreparedOptions,
} from './types.js'

export type PrepareOptions = (
  options: ServiceOptions,
  serviceId: string,
) => ServiceOptions

const prepareMatch = ({ scope, ...match }: MatchObject) =>
  scope === 'all' || !scope ? match : { scope, ...match }

const prepareEndpoint = ({ match, ...endpoint }: EndpointDef) => ({
  match: prepareMatch(match || {}),
  ...endpoint,
})

type MutationStep = (action: Action, rev: boolean) => Promise<unknown>

// Create a step that runs a mutation and populates the resulting action with
// properties from the original action and makes sure the status and error are
// correct.
const createActionMutationStep =
  (mutator: DataMapper<InitialState>): MutationStep =>
  async (action, rev) => {
    const mutatedAction = (await mutator(action, { rev })) as Action
    return populateActionAfterMutation(action, mutatedAction)
  }

const setModifyFlag = (def?: TransformDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

const createStepFromAdapter = (
  serviceId: string,
  options: Record<string, Record<string, unknown>> = {},
) =>
  function createAdapterTransformer(adapter: Adapter): MutationStep {
    const adapterId = adapter.id
    const preparedOptions =
      typeof adapterId === 'string'
        ? adapter.prepareOptions(options[adapterId] || {}, serviceId)
        : {}

    // Return the step. It will call the adapter's `serialize()` method in
    // reverse direction and `normalize()` when going forward.
    return async (action, rev) =>
      rev
        ? await adapter.serialize(action, preparedOptions)
        : await adapter.normalize(action, preparedOptions)
  }

const createMapTransform = (
  mutation: TransformDefinition | undefined,
  mapTransform: MapTransform,
  mapOptions: MapOptions,
) =>
  mapTransform(
    ensureArray(mutation).map(setModifyFlag).filter(isNotNullOrUndefined),
    mapOptions,
  )

const runSteps =
  (steps: MutationStep[]) => async (action: unknown, state?: InitialState) => {
    const rev = state?.rev ?? false
    const orderedSteps = rev ? [...steps].reverse() : steps
    let result = action
    for (const step of orderedSteps) {
      result = await step(result as Action, rev)
    }
    return result
  }

/**
 * Create a mutation pipeline for mutating an action with this endpoint. Note
 * that we use a custom pipeline here, instead of a full MapTransform pipeline,
 * as it's easier in this case. We use MapTransform in the mutation steps.
 */
function prepareActionMutation(
  serviceMutation: TransformDefinition | undefined,
  endpointMutation: TransformDefinition | undefined,
  serviceAdapters: Adapter[],
  endpointAdapters: Adapter[],
  mapTransform: MapTransform,
  mapOptions: MapOptions,
  serviceId: string,
  adapters?: Record<string, Record<string, unknown>> | undefined,
): DataMapper<InitialState> {
  // Run service adapters, service mutation, endpoint adapters and endpoint
  // mutation – in that order, or in reverse order when `rev` is true. Note
  // that we run the mutations with a step that makes sure the result is a
  // valid action and that the status and error are set correctly.
  return runSteps([
    ...serviceAdapters.map(createStepFromAdapter(serviceId, adapters)),
    createActionMutationStep(
      createMapTransform(serviceMutation, mapTransform, mapOptions),
    ),
    ...endpointAdapters.map(createStepFromAdapter(serviceId, adapters)),
    createActionMutationStep(
      createMapTransform(endpointMutation, mapTransform, mapOptions),
    ),
  ])
}

/**
 * Create endpoint from definition.
 */
export default class Endpoint {
  id?: string
  match?: MatchObject
  options: PreparedOptions
  allowRawRequest?: boolean
  allowRawResponse?: boolean
  castWithoutDefaults?: boolean
  outgoingAuth?: Auth
  incomingAuth?: Auth[]

  #origin: string
  #validator: (action: Action) => Promise<ResponsesAndBreak>
  #mutateAction: DataMapper<InitialState>
  #checkIfMatch: (action: Action, isIncoming?: boolean) => Promise<boolean>

  constructor(
    endpointDef: EndpointDef,
    serviceId: string,
    options: PreparedOptions,
    mapTransform: MapTransform,
    mapOptions: MapOptions,
    serviceMutation?: TransformDefinition,
    serviceAdapters: Adapter[] = [],
    endpointAdapters: Adapter[] = [],
    outgoingAuth?: Auth,
    incomingAuth?: Auth[],
  ) {
    this.id = endpointDef.id
    this.#origin = endpointDef.id
      ? `service:${serviceId}:endpoint:${endpointDef.id}`
      : `service:${serviceId}:endpoint`
    this.allowRawRequest = endpointDef.allowRawRequest // Don't set a default
    this.allowRawResponse = endpointDef.allowRawResponse // Don't set a default
    this.castWithoutDefaults = endpointDef.castWithoutDefaults ?? false
    this.match = endpointDef.match
    this.#checkIfMatch = isEndpointMatch(endpointDef, mapTransform, mapOptions)
    this.options = options

    this.#validator = prepareValidator(
      endpointDef.validate,
      mapTransform,
      mapOptions,
    )

    this.#mutateAction = prepareActionMutation(
      serviceMutation,
      endpointDef.mutation || endpointDef.mutate,
      serviceAdapters,
      endpointAdapters,
      mapTransform,
      mapOptions,
      serviceId,
      options.adapters,
    )

    this.outgoingAuth = outgoingAuth
    this.incomingAuth = incomingAuth
  }

  async validateAction(action: Action): Promise<Response | null> {
    const [errors] = await this.#validator(action)
    const response = combineResponses(errors)
    return response ? setOrigin(response, `validate:${this.#origin}`) : null
  }

  async mutate(action: Action, isRev: boolean): Promise<Action> {
    if (!action) {
      throw new Error('Endpoint mutation was run without action')
    }
    return (await this.#mutateAction(action, { rev: isRev })) as Action
  }

  async isMatch(action: Action, isIncoming?: boolean): Promise<boolean> {
    return await this.#checkIfMatch(action, isIncoming)
  }

  static sortAndPrepare(endpointDefs: EndpointDef[]): EndpointDef[] {
    return endpointDefs.map(prepareEndpoint).sort(compareEndpoints)
  }

  static async findMatchingEndpoint(
    endpoints: Endpoint[],
    action: Action,
    isIncoming = false,
  ): Promise<Endpoint | undefined> {
    for (const endpoint of endpoints) {
      if (await endpoint.isMatch(action, isIncoming)) {
        return endpoint
      }
    }
    return undefined
  }
}
