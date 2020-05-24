import {
  mapTransform,
  set,
  fwd,
  rev,
  ifelse,
  validate,
  MapDefinition,
  MapObject,
  MapTransform,
} from 'map-transform'
import { Dictionary, Exchange, Data } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, Endpoint, EndpointOptions } from './types'
import mapRequest from './mapRequest'
import mapResponse from './mapResponse'
import isMatch from './match'
import {
  mappingObjectFromExchange,
  exchangeFromMappingObject,
} from '../../utils/exchangeMapping'

export type Mappings = Dictionary<MapTransform>

export interface PrepareOptions {
  (options: EndpointOptions): EndpointOptions
}

const pathOrMapping = (mapping?: MapDefinition) =>
  typeof mapping === 'string' ? [`data.${mapping}`, set('data')] : mapping

export function createMapper(mapping?: MapDefinition, mapOptions?: MapOptions) {
  const preparedMapping = pathOrMapping(mapping)
  return preparedMapping ? mapTransform(preparedMapping, mapOptions) : null
}

const mappingFromDef = (def: MapDefinition | undefined) =>
  [
    fwd('data'),
    typeof def === 'string' ? { $apply: def } : def,
    rev(set('data')),
  ] as MapDefinition

export const prepareMappings = (
  mappingsDef: MapObject,
  mapOptions?: MapOptions
) =>
  Object.entries(mappingsDef).reduce(
    (mappings, [type, def]) => ({
      ...mappings,
      [type]: mapTransform(mappingFromDef(def as MapDefinition), mapOptions),
    }),
    {} as Mappings
  )

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
  serviceMappings: Dictionary<string | MapDefinition>,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  prepareOptions: PrepareOptions = (options) => options
) {
  return function (endpointDef: EndpointDef): Endpoint {
    const mutator = endpointDef.mutation
      ? mapTransform(endpointDef.mutation, mapOptions)
      : null
    const requestMapper = createMapper(endpointDef.requestMapping, mapOptions)
    const responseMapper = createMapper(endpointDef.responseMapping, mapOptions)
    const mappings = prepareMappings(
      { ...serviceMappings, ...endpointDef.mappings },
      mapOptions
    )

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
      mapRequest: mapRequest(requestMapper, mappings),
      mapResponse: mapResponse(responseMapper, mappings),
      validate,
      isMatch: isMatch(endpointDef),
    }
  }
}
