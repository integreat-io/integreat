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
import { Dictionary, Exchange } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, Endpoint, EndpointOptions } from './types'
import mapToService from './mapToService'
import mapFromService from './mapFromService'
import isMatch from './match'

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

/**
 * Create endpoint from definition.
 */
export default function createEndpoint(
  serviceMappings: Dictionary<string | MapDefinition>,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  prepareOptions: PrepareOptions = (options) => options
) {
  return (endpointDef: EndpointDef): Endpoint => {
    const fromMapper = createMapper(endpointDef.fromMapping, mapOptions)
    const toMapper = createMapper(endpointDef.toMapping, mapOptions)
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
      mapToService: mapToService(toMapper, mappings),
      mapFromService: mapFromService(fromMapper, mappings),
      validate,
      isMatch: isMatch(endpointDef),
    }
  }
}
