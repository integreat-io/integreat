const { validate } = require('map-transform')
const createRequestMapper = require('./createRequestMapper')
const createResponseMapper = require('./createResponseMapper')
const compareEndpoints = require('./compareEndpoints')
const matchEndpoint = require('./matchEndpoint')

const prepareMatch = (match = {}) => {
  const filters = (match.filters)
    ? Object.keys(match.filters).map((path) => validate(path, match.filters[path]))
    : []
  return (filters.length > 0) ? { ...match, filters } : match
}

const prepareMappings = (mappingsDef, setupMapping) => Object.keys(mappingsDef).reduce(
  (mappings, type) => {
    const mapping = setupMapping(mappingsDef[type], type)
    return (mapping) ? { ...mappings, [type]: mapping } : mappings
  },
  {}
)

const prepareEndpoint = (adapter, transformers, serviceOptions, mappings, setupMapping) => (endpoint) => ({
  ...endpoint,
  match: prepareMatch(endpoint.match),
  requestMapper: createRequestMapper(endpoint, { transformers }),
  responseMapper: createResponseMapper(endpoint, { transformers }),
  options: adapter.prepareEndpoint(endpoint.options, serviceOptions),
  mappings: prepareMappings({ ...mappings, ...endpoint.mappings }, setupMapping)
})

function prepareEndpoints ({ endpoints, options, mappings = {} }, { adapter, transformers = {}, setupMapping }) {
  const list = endpoints
    .map(prepareEndpoint(adapter, transformers, options, mappings, setupMapping))
    .sort(compareEndpoints)

  return {
    list,
    match: matchEndpoint(list)
  }
}

module.exports = prepareEndpoints
