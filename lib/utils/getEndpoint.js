const matchValue = (match, value) => (Array.isArray(match))
  ? match.includes(value)
  : (match === value)
const hasParam = (params, param) => params && params[param] !== undefined

const matchId = (endpoint, request) => !request.endpoint ||
  endpoint.id === request.endpoint
const matchType = (endpoint, request) => !endpoint.type ||
  matchValue(endpoint.type, request.type)
const matchScope = (endpoint, request) => !endpoint.scope ||
  matchValue(endpoint.scope, request.id ? (Array.isArray(request.id) ? 'members' : 'member') : 'collection')
const matchAction = (endpoint, request) => !endpoint.action ||
  matchValue(endpoint.action, request.action)
const matchParams = (endpoint, request) => !endpoint.params ||
  Object.keys(endpoint.params)
    .every((param) => !endpoint.params[param] || hasParam(request.params, param))

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
      matchAction(endpoint, request) &&
      matchParams(endpoint, request))
}

module.exports = getEndpoint
