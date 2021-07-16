import {
  mapTransform,
  modify,
  MapDefinition,
  MapTransform,
} from 'map-transform'
import { Action } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, Endpoint, EndpointOptions } from './types'
import isMatch from './match'
import {
  mappingObjectFromAction,
  actionFromMappingObject,
} from '../../utils/mappingObject'
import { ensureArray } from '../../utils/array'

export interface PrepareOptions {
  (options: EndpointOptions, serviceId: string): EndpointOptions
}

function mutate(
  mutator: MapTransform,
  data: unknown,
  fromService: boolean,
  noDefaults = false
) {
  if (fromService) {
    return noDefaults ? mutator.onlyMappedValues(data) : mutator(data)
  } else {
    return noDefaults ? mutator.rev.onlyMappedValues(data) : mutator.rev(data)
  }
}

function mutateAction(
  mutator: MapTransform | null,
  isRequest: boolean,
  mapNoDefaults: boolean
) {
  if (!mutator) {
    return (action: Action) => action
  }

  return (action: Action, isIncoming = false) =>
    actionFromMappingObject(
      action,
      mutate(
        mutator,
        mappingObjectFromAction(action, isRequest),
        isRequest ? !!isIncoming : !isIncoming,
        mapNoDefaults ||
          (isRequest
            ? action.payload.sendNoDefaults
            : action.response?.returnNoDefaults)
      ),
      isRequest
    )
}

const flattenOne = <T>(arr: T[]): T | T[] => (arr.length <= 1 ? arr[0] : arr)

const combineMutations = (
  ...mutations: (MapDefinition | undefined)[]
): MapDefinition =>
  flattenOne((mutations.filter(Boolean) as MapDefinition[]).map(modify))

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
  serviceId: string,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: MapDefinition,
  prepareOptions: PrepareOptions = (options) => options
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const mutation = combineMutations(
      ...ensureArray(serviceMutation),
      endpointDef.mutation
    )
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
      sendNoDefaults = false,
      returnNoDefaults = false,
      match,
    } = endpointDef

    return {
      id,
      allowRawRequest,
      allowRawResponse,
      match,
      options,
      mutateRequest: mutateAction(mutator, true, sendNoDefaults),
      mutateResponse: mutateAction(mutator, false, returnNoDefaults),
      isMatch: isMatch(endpointDef),
    }
  }
}