const createRequestMapper = require('./createRequestMapper')
const createResponseMapper = require('./createResponseMapper')
const compareEndpoints = require('../utils/compareEndpoints')

const prepareEndpoint = (adapter, serviceOptions) => (endpoint) => ({
  ...endpoint,
  requestMapper: createRequestMapper(endpoint),
  responseMapper: createResponseMapper(endpoint),
  options: adapter.prepareEndpoint(endpoint.options, serviceOptions)
})

function prepareEndpoints (endpoints, adapter, serviceOptions) {
  return endpoints
    .map(prepareEndpoint(adapter, serviceOptions))
    .sort(compareEndpoints)
}

module.exports = prepareEndpoints
