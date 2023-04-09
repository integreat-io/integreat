import mapTransform from 'map-transform'
import type {
  TransformDefinition,
  DataMapperEntry,
  Pipeline,
} from 'map-transform/types.js'
import type { Action } from '../../types.js'
import type { MapOptions } from '../types.js'
import type { EndpointDef, Endpoint, EndpointOptions } from './types.js'
import isMatch from './match.js'
import {
  prepareActionForMapping,
  populateActionAfterMapping,
} from '../../utils/mappingHelpers.js'
import { ensureArray } from '../../utils/array.js'
import { isNotNullOrUndefined, isObject } from '../../utils/is.js'
import xor from '../../utils/xor.js'

export interface PrepareOptions {
  (options: EndpointOptions, serviceId: string): EndpointOptions
}

function mutateAction(mutator: DataMapperEntry | null, isRev: boolean) {
  if (!mutator) {
    return (action: Action) => action
  }

  return (action: Action, isIncoming = false) =>
    populateActionAfterMapping(
      action,
      mutator(prepareActionForMapping(action, isRev), {
        rev: xor(isRev, isIncoming),
      }) as Partial<Action>
    )
}

const flattenIfOneOrNone = <T>(arr: T[]): T | T[] =>
  arr.length <= 1 ? arr[0] : arr

const setModifyFlag = (def?: TransformDefinition) =>
  isObject(def) ? { ...def, $modify: true } : def

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
  serviceId: string,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: TransformDefinition,
  prepareOptions: PrepareOptions = (options) => options
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const mutation = flattenIfOneOrNone(
      [...ensureArray(serviceMutation), ...ensureArray(endpointDef.mutation)]
        .map(setModifyFlag)
        .filter(isNotNullOrUndefined)
    ) as Pipeline | TransformDefinition
    const mutator = mutation ? mapTransform(mutation, mapOptions) : null

    const options = prepareOptions(
      {
        ...serviceOptions,
        ...endpointDef.options,
      },
      serviceId
    )

    const {
      id,
      allowRawRequest = false,
      allowRawResponse = false,
      match,
    } = endpointDef

    return {
      id,
      allowRawRequest,
      allowRawResponse,
      match,
      options,
      mutateRequest: mutateAction(mutator, true),
      mutateResponse: mutateAction(mutator, false),
      isMatch: isMatch(endpointDef),
    }
  }
}
