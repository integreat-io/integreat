/* eslint-disable security/detect-object-injection */
import mapTransform from 'map-transform'
import pPipe from 'p-pipe'
import compareEndpoints from './utils/compareEndpoints.js'
import isMatch from './utils/matchEnpoints.js'
import { populateActionAfterMutation } from '../utils/mutationHelpers.js'
import { ensureArray } from '../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../utils/is.js'
import type {
  TransformDefinition,
  DataMapper,
  InitialState,
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

interface MutateAction {
  (action: Action): Promise<Action>
}

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

async function mutateAction(
  action: Action,
  isRev: boolean,
  mutator: DataMapperEntry | null,
  normalize: MutateAction = async (action) => action,
  serialize: MutateAction = async (action) => action
) {
  // Normalize action if we're coming _from_ a service
  const normalizedAction = isRev ? action : await normalize(action)

  // Mutate action
  const mutatedAction = mutator
    ? populateActionAfterMutation(
        action,
        mutator(normalizedAction, { rev: isRev }) as Action
      )
    : normalizedAction

  // Serialize action if we're going _to_ a service
  return isRev ? await serialize(mutatedAction) : mutatedAction
}

const flattenIfOneOrNone = <T>(arr: T[]): T | T[] =>
  arr.length <= 1 ? arr[0] : arr

const setModifyFlag = (def?: TransformDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

const prepareAdapter = (
  serviceId: string,
  options: Record<string, Record<string, unknown>> = {},
  isSerialize = false
) =>
  function prepareAdapter(adapter: Adapter) {
    const adapterId = adapter.id
    const preparedOptions =
      typeof adapterId === 'string'
        ? adapter.prepareOptions(options[adapterId] || {}, serviceId)
        : {}
    return isSerialize
      ? async (action: Action): Promise<Action> =>
          await adapter.serialize(action, preparedOptions)
      : async (action: Action): Promise<Action> =>
          await adapter.normalize(action, preparedOptions)
  }

const pipeAdapters = (adapters: MutateAction[]) =>
  adapters.length > 0 ? (pPipe(...adapters) as MutateAction) : undefined

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
  #checkIfMatch: (action: Action, isIncoming?: boolean) => Promise<boolean>

  constructor(
    endpointDef: EndpointDef,
    serviceId: string,
    options: PreparedOptions,
    mapOptions: MapOptions,
    serviceMutation?: TransformDefinition,
    adapters: Adapter[] = []
  ) {
    this.id = endpointDef.id
    this.allowRawRequest = endpointDef.allowRawRequest ?? false
    this.allowRawResponse = endpointDef.allowRawResponse ?? false
    this.match = endpointDef.match
    this.#checkIfMatch = isMatch(endpointDef)
    this.options = options

    this.#validator = prepareValidator(endpointDef.validate, mapOptions)
    const mutation = flattenIfOneOrNone(
      [...ensureArray(serviceMutation), ...ensureArray(endpointDef.mutation)]
        .map(setModifyFlag)
        .filter(isNotNullOrUndefined)
    ) as Pipeline | TransformDefinition
    this.#mutator = mutation ? mapTransform(mutation, mapOptions) : null

    this.#normalize = pipeAdapters(
      adapters.map(prepareAdapter(serviceId, options.adapters, false))
    )
    adapters.reverse() // Reverse adapter order before creating the serializer
    this.#serialize = pipeAdapters(
      adapters.map(prepareAdapter(serviceId, options.adapters, true))
    )
  }

  async validateAction(action: Action) {
    return await this.#validator(action)
  }

  mutate(action: Action, isRev: boolean) {
    return mutateAction(
      action,
      isRev,
      this.#mutator,
      this.#normalize,
      this.#serialize
    )
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
