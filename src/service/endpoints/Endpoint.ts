import mapTransform from 'map-transform'
import pPipe from 'p-pipe'
import type {
  TransformDefinition,
  DataMapperEntry,
  Pipeline,
} from 'map-transform/types.js'
import type { Action, Adapter } from '../../types.js'
import type { MapOptions } from '../types.js'
import type { EndpointDef, EndpointOptions, MatchObject } from './types.js'
import isMatch from './match.js'
import { populateActionAfterMutation } from '../../utils/mutationHelpers.js'
import { ensureArray } from '../../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../../utils/is.js'

interface MutateAction {
  (action: Action): Promise<Action>
}

export interface PrepareOptions {
  (options: EndpointOptions, serviceId: string): EndpointOptions
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
  options: EndpointOptions,
  serviceId: string,
  doSerialize = false
) =>
  function prepareAdapter(adapter: Adapter) {
    const preparedOptions = adapter.prepareOptions(options, serviceId)
    return doSerialize
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
  options: EndpointOptions
  mutation?: TransformDefinition
  adapters?: (string | Adapter)[]
  allowRawRequest?: boolean
  allowRawResponse?: boolean

  #mutator: DataMapperEntry | null
  #normalize?: MutateAction
  #serialize?: MutateAction
  #checkIfMatch: (action: Action, isIncoming?: boolean) => boolean

  constructor(
    endpointDef: EndpointDef,
    serviceId: string,
    serviceOptions: EndpointOptions,
    mapOptions: MapOptions,
    serviceMutation?: TransformDefinition,
    prepareOptions: PrepareOptions = (options) => options,
    serviceAdapters: Adapter[] = []
  ) {
    this.id = endpointDef.id
    this.allowRawRequest = endpointDef.allowRawRequest ?? false
    this.allowRawResponse = endpointDef.allowRawResponse ?? false
    this.match = endpointDef.match
    this.#checkIfMatch = isMatch(endpointDef)

    const mutation = flattenIfOneOrNone(
      [...ensureArray(serviceMutation), ...ensureArray(endpointDef.mutation)]
        .map(setModifyFlag)
        .filter(isNotNullOrUndefined)
    ) as Pipeline | TransformDefinition
    this.#mutator = mutation ? mapTransform(mutation, mapOptions) : null

    const options = { ...serviceOptions, ...endpointDef.options }
    this.options = prepareOptions(options, serviceId)

    const { adapters = [] } = endpointDef
    const allAdapters = [...serviceAdapters, ...(adapters as Adapter[])] // We know we're getting only adapters here
    this.#normalize = pipeAdapters(
      allAdapters.map(prepareAdapter(options, serviceId, false))
    )
    allAdapters.reverse() // Reverse adapter order before creating the serializer
    this.#serialize = pipeAdapters(
      allAdapters.map(prepareAdapter(options, serviceId, true))
    )
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

  isMatch(action: Action, isIncoming?: boolean): boolean {
    return this.#checkIfMatch(action, isIncoming)
  }
}
