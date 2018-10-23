const createRequestMapper = require('./createRequestMapper')
const createResponseMapper = require('./createResponseMapper')
const compareEndpoints = require('./compareEndpoints')
const matchEndpoint = require('./matchEndpoint')

const prepareEndpoint = (adapter, transformers, serviceOptions) => (endpoint) => ({
  ...endpoint,
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
