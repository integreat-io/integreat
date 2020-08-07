import {
  mapTransform,
  modify,
  MapDefinition,
  MapTransform,
} from 'map-transform'
import { Exchange, Data } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, Endpoint, EndpointOptions } from './types'
import isMatch from './match'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
} from '../../utils/exchangeMapping'
import { ensureArray } from '../../utils/array'

export interface PrepareOptions {
  (options: EndpointOptions): EndpointOptions
}

function mutate(
  mutator: MapTransform,
  data: Data,
  fromService: boolean,
  noDefaults: boolean
) {
  if (fromService) {
    return noDefaults ? mutator.onlyMappedValues(data) : mutator(data)
  } else {
    return noDefaults ? mutator.rev.onlyMappedValues(data) : mutator.rev(data)
  }
}

function mutateExchange(
  mutator: MapTransform | null,
  isRequest: boolean,
  mapNoDefaults: boolean
) {
  if (!mutator) {
    return (exchange: Exchange) => exchange
  }
  return (exchange: Exchange) =>
    exchangeFromMappingObject(
      exchange,
      mutate(
        mutator,
        mappingObjectFromExchange(exchange, isRequest),
        isRequest ? !!exchange.incoming : !exchange.incoming,
        mapNoDefaults ||
          (isRequest
            ? exchange.request.sendNoDefaults
            : exchange.response.returnNoDefaults)
      ),
      isRequest
    )
}

const flattenOne = <T>(arr: T[]): T | T[] => (arr.length <= 1 ? arr[0] : arr)

const combineMutations = (
  ...mutations: (MapDefinition | undefined)[]
): MapDefinition => flattenOne(mutations.filter(Boolean).map(modify))

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
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

    const options = prepareOptions({
      ...serviceOptions,
      ...endpointDef.options,
    })

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
      mutateRequest: mutateExchange(mutator, true, sendNoDefaults),
      mutateResponse: mutateExchange(mutator, false, returnNoDefaults),
      isMatch: isMatch(endpointDef),
    }
  }
}
