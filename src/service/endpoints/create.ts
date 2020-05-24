import {
  mapTransform,
  ifelse,
  validate,
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

export interface PrepareOptions {
  (options: EndpointOptions): EndpointOptions
}

const validateNoStatus = validate('status', { const: null })

const preparePipeline = (defs: MapDefinition) =>
  ([] as MapDefinition[])
    .concat(defs)
    .map((fn) =>
      typeof fn === 'string'
        ? ifelse(validateNoStatus, { $transform: fn })
        : typeof fn === 'function'
        ? ifelse(validateNoStatus, fn)
        : undefined
    )
    .filter(Boolean) as MapDefinition

const prepareValidate = (
  validate: MapDefinition | undefined,
  mapOptions: MapOptions
) =>
  validate
    ? mapTransform(preparePipeline(validate), mapOptions)
    : (exchange: Exchange) => exchange

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

function mutateExchange(mutator: MapTransform | null, isRequest: boolean) {
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
        isRequest
          ? exchange.request.sendNoDefaults
          : exchange.response.returnNoDefaults
      ),
      isRequest
    )
}

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  prepareOptions: PrepareOptions = (options) => options
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const mutator = endpointDef.mutation
      ? mapTransform(endpointDef.mutation, mapOptions)
      : null

    const validate = prepareValidate(endpointDef.validate, mapOptions)

    const options = prepareOptions({
      ...serviceOptions,
      ...endpointDef.options,
    })

    return {
      id: endpointDef.id,
      match: endpointDef.match,
      options,
      mutateRequest: mutateExchange(mutator, /* isRequest: */ true),
      mutateResponse: mutateExchange(mutator, /* isRequest: */ false),
      validate,
      isMatch: isMatch(endpointDef),
    }
  }
}
