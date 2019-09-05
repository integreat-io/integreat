import {
  mapTransform,
  set,
  fwd,
  rev,
  validate,
  MapDefinition,
  MapObject
} from 'map-transform'
import compareEndpoints from './compareEndpoints'
import matchEndpoint from './matchEndpoint'
import { preparePipeline } from '../utils/preparePipeline'
import { DataObject } from '../types'

function createMapper(mapping: MapDefinition, mapOptions: DataObject) {
  if (mapping) {
    return mapTransform(
      typeof mapping === 'string' ? [`data.${mapping}`, set('data')] : mapping,
      mapOptions
    )
  }
  return null
}

const prepareMatch = (match = {}) => {
  const filters = match.filters
    ? Object.keys(match.filters).map(
        path => validate(path, match.filters[path]) // eslint-disable-line security/detect-object-injection
      )
    : []
  return filters.length > 0 ? { ...match, filters } : match
}

const mappingFromDef = (def: MapDefinition | undefined) =>
  [
    fwd('data'),
    typeof def === 'string' ? { $apply: def } : def,
    rev(set('data'))
  ] as MapDefinition

const prepareMappings = (mappingsDef: MapObject, mapOptions: DataObject) =>
  Object.entries(mappingsDef).reduce(
    (mappings, [type, def]) => ({
      ...mappings,
      [type]: mapTransform(mappingFromDef(def as MapDefinition), mapOptions)
    }),
    {}
  )

const callUntilResponse = fns => action => {
  for (const fn of fns) {
    const response = fn(action)
    if (response !== null) {
      return response
    }
  }
  return null
}

const prepareValidate = (validate, transformers) =>
  callUntilResponse(preparePipeline(validate, transformers))

const prepareEndpoint = (
  adapter,
  transformers,
  serviceOptions,
  mappings,
  mapOptions
) => endpoint => ({
  ...endpoint,
  match: prepareMatch(endpoint.match),
  validate: prepareValidate(endpoint.validate, transformers),
  requestMapper: createMapper(endpoint.requestMapping, mapOptions),
  responseMapper: createMapper(endpoint.responseMapping, mapOptions),
  options: endpoint.incoming
    ? endpoint.options
    : adapter.prepareEndpoint(endpoint.options, serviceOptions),
  mappings: prepareMappings({ ...mappings, ...endpoint.mappings }, mapOptions)
})

function prepareEndpoints(
  { endpoints, options, mappings = {} },
  { adapter, transformers = {}, mapOptions }
) {
  const list = endpoints
    .map(prepareEndpoint(adapter, transformers, options, mappings, mapOptions))
    .sort(compareEndpoints)

  return {
    list,
    match: matchEndpoint(list)
  }
}

export default prepareEndpoints
