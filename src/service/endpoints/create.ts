import mapTransform from 'map-transform'
import pPipe from 'p-pipe'
import type {
  TransformDefinition,
  DataMapperEntry,
  Pipeline,
} from 'map-transform/types.js'
import type { Action, Adapter } from '../../types.js'
import type { MapOptions } from '../types.js'
import type {
  EndpointDef,
  Endpoint,
  EndpointOptions,
  ValidateObject,
} from './types.js'
import isMatch from './match.js'
import { populateActionAfterMutation } from '../../utils/mutationHelpers.js'
import { ensureArray } from '../../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../../utils/is.js'
import xor from '../../utils/xor.js'

interface MutateAction {
  (action: Action): Promise<Action>
}

export interface PrepareOptions {
  (options: EndpointOptions, serviceId: string): EndpointOptions
}

function mutateAction(
  mutator: DataMapperEntry | null,
  isRev: boolean,
  normalize: MutateAction = async (action) => action,
  serialize: MutateAction = async (action) => action
) {
  return async function doMutateAction(action: Action, isIncoming = false) {
    // Correct rev based on if this is an incoming action or not
    const rev = xor(isRev, isIncoming)

    // Normalize action if we're coming _from_ a service
    const normalizedAction = rev ? action : await normalize(action)

    // Mutate action
    const mutatedAction = mutator
      ? populateActionAfterMutation(
          action,
          mutator(normalizedAction, {
            rev,
          }) as Action
        )
      : normalizedAction

    // Serialize action if we're going _to_ a service
    return rev ? await serialize(mutatedAction) : mutatedAction
  }
}

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
    failResponse,
  }))

  return async function validateAction(action: Action) {
    for (const { validate, failResponse } of validators) {
      const result = validate(action)
      if (!result)
        return (
          failResponse || {
            status: 'badrequest',
            error: 'Did not satisfy endpoint validation',
          }
        )
    }
    return null
  }
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
export default function createEndpoint(
  serviceId: string,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: TransformDefinition,
  prepareOptions: PrepareOptions = (options) => options,
  serviceAdapters: Adapter[] = []
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const {
      id,
      validate,
      allowRawRequest = false,
      allowRawResponse = false,
      match,
      adapters = [],
    } = endpointDef

    const mutation = flattenIfOneOrNone(
      [...ensureArray(serviceMutation), ...ensureArray(endpointDef.mutation)]
        .map(setModifyFlag)
        .filter(isNotNullOrUndefined)
    ) as Pipeline | TransformDefinition
    const mutator = mutation ? mapTransform(mutation, mapOptions) : null
    const validator = prepareValidator(validate, mapOptions)

    const options = { ...serviceOptions, ...endpointDef.options }
    const preparedOptions = prepareOptions(options, serviceId)

    const allAdapters = [...serviceAdapters, ...(adapters as Adapter[])] // We know we're getting only adapters here
    const normalize = pipeAdapters(
      allAdapters.map(prepareAdapter(options, serviceId, false))
    )
    allAdapters.reverse() // Reverse adapter order before creating the serializer
    const serialize = pipeAdapters(
      allAdapters.map(prepareAdapter(options, serviceId, true))
    )

    return {
      id,
      allowRawRequest,
      allowRawResponse,
      match,
      options: preparedOptions,
      validateAction: validator,
      mutateRequest: mutateAction(mutator, true, normalize, serialize),
      mutateResponse: mutateAction(mutator, false, normalize, serialize),
      isMatch: isMatch(endpointDef),
    }
  }
}
