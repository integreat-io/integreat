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

const prepareEndpoint = (adapter, transformers, serviceOptions) => (endpoint) => ({
  ...endpoint,
  match: prepareMatch(endpoint.match),
  requestMapper: createRequestMapper(endpoint, { transformers }),
  responseMapper: createResponseMapper(endpoint, { transformers }),
  options: adapter.prepareEndpoint(endpoint.options, serviceOptions)
})

function prepareEndpoints (endpoints, adapter, transformers, serviceOptions) {
  const list = endpoints
    .map(prepareEndpoint(adapter, transformers, serviceOptions))
    .sort(compareEndpoints)

  return {
    list,
    match: matchEndpoint(list)
  }
}

module.exports = prepareEndpoints
