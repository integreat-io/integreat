import { validate } from 'map-transform'
import createRequestMapper from './createRequestMapper'
import createResponseMapper from './createResponseMapper'
import compareEndpoints from './compareEndpoints'
import matchEndpoint from './matchEndpoint'
import { preparePipeline } from '../utils/preparePipeline'

const prepareMatch = (match = {}) => {
  const filters = match.filters
    ? Object.keys(match.filters).map(path =>
        validate(path, match.filters[path])
      )
    : []
  return filters.length > 0 ? { ...match, filters } : match
}

const prepareMappings = (mappingsDef, setupMapping) =>
  Object.keys(mappingsDef).reduce((mappings, type) => {
    const mapping = setupMapping(mappingsDef[type], type)
    return mapping ? { ...mappings, [type]: mapping } : mappings
  }, {})

const callUntilResponse = fns => action => {
  for (let fn of fns) {
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
  setupMapping
) => endpoint => ({
  ...endpoint,
  match: prepareMatch(endpoint.match),
  validate: prepareValidate(endpoint.validate, transformers),
  requestMapper: createRequestMapper(endpoint, { transformers }),
  responseMapper: createResponseMapper(endpoint, { transformers }),
  options: endpoint.incoming
    ? endpoint.options
    : adapter.prepareEndpoint(endpoint.options, serviceOptions),
  mappings: prepareMappings({ ...mappings, ...endpoint.mappings }, setupMapping)
})

function prepareEndpoints(
  { endpoints, options, mappings = {} },
  { adapter, transformers = {}, setupMapping }
) {
  const list = endpoints
    .map(
      prepareEndpoint(adapter, transformers, options, mappings, setupMapping)
    )
    .sort(compareEndpoints)

  return {
    list,
    match: matchEndpoint(list)
  }
}

export default prepareEndpoints
