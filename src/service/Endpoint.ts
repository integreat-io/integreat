/* eslint-disable security/detect-object-injection */
import compareEndpoints from './utils/compareEndpoints.js'
import isEndpointMatch from './utils/isEndpointMatch.js'
import { populateActionAfterMutation } from '../utils/mutationHelpers.js'
import { ensureArray } from '../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../utils/is.js'
import { combineResponses, setOrigin } from '../utils/response.js'
import prepareValidator, { ResponsesAndBreak } from '../utils/validation.js'
import type {
  TransformDefinition,
  DataMapper,
  InitialState,
  State,
  AsyncDataMapperWithOptions,
} from 'map-transform/types.js'
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

export interface PrepareOptions {
  (options: ServiceOptions, serviceId: string): ServiceOptions
}

const prepareMatch = ({ scope, ...match }: MatchObject) =>
  scope === 'all' || !scope ? match : { scope, ...match }

const prepareEndpoint = ({ match, ...endpoint }: EndpointDef) => ({
  match: prepareMatch(match || {}),
  ...endpoint,
})

// Create a transformer that runs a mutation and populates the resulting action
// with properties from the original action and makes sure the status and error
// are correct.
function runMutationAndPopulateAction(mutator: DataMapper) {
  return () => async (action: unknown, state: State) => {
    const mutatedAction = (await mutator(action, state)) as Action
    return populateActionAfterMutation(action as Action, mutatedAction)
  }
}

const setModifyFlag = (def?: TransformDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

const transformerFromAdapter = (
  serviceId: string,
  options: Record<string, Record<string, unknown>> = {},
) =>
  function createAdapterTransformer(
    adapter: Adapter,
  ): AsyncDataMapperWithOptions {
    const adapterId = adapter.id
    const preparedOptions =
      typeof adapterId === 'string'
        ? adapter.prepareOptions(options[adapterId] || {}, serviceId)
        : {}

    // Return the transformer. It will call the adapter's `serialize()` method
    // in reverse direction and `normalize()` when going forward.
    return () => async (action, state) =>
      state.rev
        ? await adapter.serialize(action as Action, preparedOptions)
        : await adapter.normalize(action as Action, preparedOptions)
  }

function prepareActionMutation(
  serviceMutation: TransformDefinition | undefined,
  endpointMutation: TransformDefinition | undefined,
  serviceAdapterTransformer: AsyncDataMapperWithOptions[],
  endpointAdapterTransformer: AsyncDataMapperWithOptions[],
  mapTransform: MapTransform,
  mapOptions: MapOptions,
) {
  // Prepare service and endpoint mutations as separate mutate functions that
  // can be run as a transformer in the pipeline.
  const serviceMutator = mapTransform(
    ensureArray(serviceMutation)
      .map(setModifyFlag)
      .filter(isNotNullOrUndefined),
    mapOptions,
  )
  const endpointMutator = mapTransform(
    ensureArray(endpointMutation)
      .map(setModifyFlag)
      .filter(isNotNullOrUndefined),
    mapOptions,
  )

  // TODO: Consider rewriting without the `{ $transform }` operations
  // Prepare the pipeline, with service adapters, service mutation, endpoint
  // adapters and endpoint mutation – in that order. Note that we run the
  // mutations with a transformer that makes sure the result is a valid action
  // and that the status and error are set correctly.
  const pipeline = [
    ...serviceAdapterTransformer.map((transformer) => ({
      $transform: transformer,
    })),
    { $transform: runMutationAndPopulateAction(serviceMutator) },
    ...endpointAdapterTransformer.map((transformer) => ({
      $transform: transformer,
    })),
    { $transform: runMutationAndPopulateAction(endpointMutator) },
  ]
  return mapTransform(pipeline, mapOptions)
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
      serviceAdapters.map(transformerFromAdapter(serviceId, options.adapters)),
      endpointAdapters.map(transformerFromAdapter(serviceId, options.adapters)),
      mapTransform,
      mapOptions,
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
