const createRequestMapper = require('./createRequestMapper')
const createResponseMapper = require('./createResponseMapper')
const compareEndpoints = require('./compareEndpoints')
const matchEndpoint = require('./matchEndpoint')

const prepareEndpoint = (adapter, serviceOptions) => (endpoint) => ({
  ...endpoint,
  requestMapper: createRequestMapper(endpoint),
  responseMapper: createResponseMapper(endpoint),
  options: adapter.prepareEndpoint(endpoint.options, serviceOptions)
})

function prepareEndpoints (endpoints, adapter, serviceOptions) {
  const list = endpoints
    .map(prepareEndpoint(adapter, serviceOptions))
    .sort(compareEndpoints)

  return {
    list,
    match: matchEndpoint(list)
  }
}

module.exports = prepareEndpoints
