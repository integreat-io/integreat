const matchId = (endpoint, request) => !request.endpoint || endpoint.id === request.endpoint
const matchType = (endpoint, request) => !endpoint.type || endpoint.type === request.type
const matchScope = (endpoint, request) => !endpoint.scope ||
  (request.id ? endpoint.scope === 'member' : endpoint.scope === 'collection')
const matchAction = (endpoint, request) => !endpoint.action || endpoint.action === request.action

/**
 * Return the first matching endpoint from an array of endpoints that has
 * already been sortert with higher specifity first. Type should match before
 * scope, which should match before action, but the order here is taken care of
 * by the required sorting.
 *
 * @param {Object[]} endpoints - Array of endpoint objects
 * @param {Object} request - Request object to match agains
 * @returns {Object} Matching endpoint
 */
function getEndpoint (endpoints, request) {
  return endpoints
    .find((endpoint) =>
      matchId(endpoint, request) &&
      matchType(endpoint, request) &&
      matchScope(endpoint, request) &&
      matchAction(endpoint, request))
}

module.exports = getEndpoint
