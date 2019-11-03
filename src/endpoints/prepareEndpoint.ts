import {
  mapTransform,
  set,
  fwd,
  rev,
  validate,
  CustomFunction,
  MapDefinition,
  MapObject
} from 'map-transform'
import { lookupById } from '../utils/indexUtils'
import {
  Dictionary,
  Action,
  Response,
  Data,
  Adapter,
  MapOptions
} from '../types'
import { EndpointDef, MatchObject } from './types'

export interface FilterFunction {
  (action: Action): Response | null
}

const isCustomFunction = (fn: unknown): fn is CustomFunction =>
  typeof fn === 'function'

function preparePipeline(
  defs: MapDefinition,
  collection: Dictionary<CustomFunction> = {}
): CustomFunction[] {
  const pipeline = ([] as MapDefinition[]).concat(defs)

  return pipeline
    .map((key: unknown) => lookupById(key, collection) || key)
    .filter(isCustomFunction)
}

const prepareMatch = (match: MatchObject = {}) => {
  const filters = match.filters
    ? Object.keys(match.filters).map(
        // eslint-disable-next-line security/detect-object-injection
        path =>
          validate(
            path,
            lookupById(path, match.filters as Dictionary<object>) || false
          )
      )
    : []
  return filters.length > 0 ? { ...match, filters } : match
}

const callWhileReturningNull = (fns: CustomFunction[]) => (action: Data) => {
  for (const fn of fns) {
    const response = fn({}, {})(action, { rev: false, onlyMappedValues: false })
    if (response !== null) {
      return response
    }
  }
  return null
}

const prepareValidate = (
  validate: MapDefinition | undefined,
  transformers: Dictionary<CustomFunction>
) =>
  validate
    ? callWhileReturningNull(preparePipeline(validate, transformers))
    : () => null

function createMapper(mapping?: MapDefinition, mapOptions?: MapOptions) {
  if (mapping) {
    return mapTransform(
      typeof mapping === 'string' ? [`data.${mapping}`, set('data')] : mapping,
      mapOptions
    )
  }
  return null
}

const mappingFromDef = (def: MapDefinition | undefined) =>
  [
    fwd('data'),
    typeof def === 'string' ? { $apply: def } : def,
    rev(set('data'))
  ] as MapDefinition

const prepareMappings = (mappingsDef: MapObject, mapOptions?: MapOptions) =>
  Object.entries(mappingsDef).reduce(
    (mappings, [type, def]) => ({
      ...mappings,
      [type]: mapTransform(mappingFromDef(def as MapDefinition), mapOptions)
    }),
    {} as Dictionary<(data: Data) => Data>
  )

export default function prepareEndpoint(
  adapter: Adapter,
  transformers: Dictionary<CustomFunction>,
  serviceOptions: Dictionary<unknown>,
  mappings: Dictionary<string | MapDefinition>,
  mapOptions?: MapOptions
) {
  return (endpoint: EndpointDef) => ({
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
}
