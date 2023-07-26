/* eslint-disable security/detect-object-injection */
import mapTransform, { transform } from 'map-transform'
import compareEndpoints from './utils/compareEndpoints.js'
import isMatch from './utils/matchEnpoints.js'
import { populateActionAfterMutation } from '../utils/mutationHelpers.js'
import { ensureArray } from '../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../utils/is.js'
import type {
  TransformDefinition,
  DataMapper,
  InitialState,
  State,
  AsyncDataMapperWithOptions,
} from 'map-transform/types.js'
import type { Action, Response, Adapter } from '../types.js'
import type {
  MapOptions,
  EndpointDef,
  ServiceOptions,
  MatchObject,
  ValidateObject,
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

function prepareValidator(
  validate: ValidateObject[] | undefined,
  mapOptions: MapOptions
) {
  // Always return null when no validation
  if (!Array.isArray(validate) || validate.length === 0) {
    return async () => null
  }

  // Prepare validators
  const validators = validate.map(({ condition, failResponse }) => ({
    validate: mapTransform(condition, mapOptions),
    failResponse: isObject(failResponse)
      ? failResponse
      : {
          status: 'badrequest',
          error:
            typeof failResponse === 'string'
              ? failResponse
              : 'Did not satisfy endpoint validation',
        },
  }))

  return async function validateAction(action: Action) {
    for (const { validate, failResponse } of validators) {
      const result = await validate(action)
      if (!result) return failResponse
    }
    return null
  }
}

// Create a transformer that runs a mutation and populates the resulting action
// with properties from the original action and makes sure the status and error
// are correct.
function runMutationAndPopulateAction(mutator: DataMapper) {
  return () => async (action: unknown, state: State) => {
    // TODO: Throw here if we don't get an action?
    const mutatedAction = (await mutator(action, state)) as Action
    return populateActionAfterMutation(action as Action, mutatedAction)
  }
}

const setModifyFlag = (def?: TransformDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

const transformerFromAdapter = (
  serviceId: string,
  options: Record<string, Record<string, unknown>> = {}
) =>
  function createAdapterTransformer(
    adapter: Adapter
  ): AsyncDataMapperWithOptions {
    const adapterId = adapter.id
    const preparedOptions =
      typeof adapterId === 'string'
        ? adapter.prepareOptions(options[adapterId] || {}, serviceId)
        : {}

    // Return the transformer. It will call the adapter's `serialize()` method
    // in reverse direction and `normalize()` when going forward.
    return () => async (action, state) =>
      // TODO: Throw here if we don't get an action?
      state.rev
        ? await adapter.serialize(action as Action, preparedOptions)
        : await adapter.normalize(action as Action, preparedOptions)
  }

function prepareActionMutation(
  serviceMutation: TransformDefinition | undefined,
  endpointMutation: TransformDefinition | undefined,
  serviceAdapterTransformer: AsyncDataMapperWithOptions[],
  endpointAdapterTransformer: AsyncDataMapperWithOptions[],
  mapOptions: MapOptions
) {
  // Prepare service and endpoint mutations as separate mutate functions that
  // can be run as a transformer in the pipeline.
  const serviceMutator = mapTransform(
    ensureArray(serviceMutation)
      .map(setModifyFlag)
      .filter(isNotNullOrUndefined),
    mapOptions
  )
  const endpointMutator = mapTransform(
    ensureArray(endpointMutation)
      .map(setModifyFlag)
      .filter(isNotNullOrUndefined),
    mapOptions
  )

  // Prepare the pipeline, with service adapters, service mutation, endpoint
  // adapters and endpoint mutation – in that order. Note that we run the
  // mutations with a transformer that makes sure the result is a valid action
  // and that the status and error are set correctly.
  const pipeline = [
    ...serviceAdapterTransformer.map((transformer) => transform(transformer)),
    transform(runMutationAndPopulateAction(serviceMutator)),
    ...endpointAdapterTransformer.map((transformer) => transform(transformer)),
    transform(runMutationAndPopulateAction(endpointMutator)),
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
  mutation?: TransformDefinition
  adapters?: (string | Adapter)[]
  allowRawRequest?: boolean
  allowRawResponse?: boolean

  #validator: (action: Action) => Promise<Response | null>
  #mutateAction: DataMapper<InitialState>
  #checkIfMatch: (action: Action, isIncoming?: boolean) => Promise<boolean>

  constructor(
    endpointDef: EndpointDef,
    serviceId: string,
    options: PreparedOptions,
    mapOptions: MapOptions,
    serviceMutation?: TransformDefinition,
    serviceAdapters: Adapter[] = [],
    endpointAdapters: Adapter[] = []
  ) {
    this.id = endpointDef.id
    this.allowRawRequest = endpointDef.allowRawRequest ?? false
    this.allowRawResponse = endpointDef.allowRawResponse ?? false
    this.match = endpointDef.match
    this.#checkIfMatch = isMatch(endpointDef)
    this.options = options

    this.#validator = prepareValidator(endpointDef.validate, mapOptions)

    this.#mutateAction = prepareActionMutation(
      serviceMutation,
      endpointDef.mutation,
      serviceAdapters.map(transformerFromAdapter(serviceId, options.adapters)),
      endpointAdapters.map(transformerFromAdapter(serviceId, options.adapters)),
      mapOptions
    )
  }

  async validateAction(action: Action) {
    return await this.#validator(action)
  }

  async mutate(action: Action, isRev: boolean): Promise<Action> {
    // TODO: Throw here if we don't get an action?
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
    isIncoming = false
  ): Promise<Endpoint | undefined> {
    for (const endpoint of endpoints) {
      if (await endpoint.isMatch(action, isIncoming)) {
        return endpoint
      }
    }
    return undefined
  }
}
