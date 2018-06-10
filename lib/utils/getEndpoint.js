const matchValue = (match, value) => (Array.isArray(match))
  ? match.includes(value)
  : (match === value)
const hasParam = (params, param) => params && params[param] !== undefined

const matchId = (endpoint, request) => !request.endpoint ||
  endpoint.id === request.endpoint
const matchType = ({match = {}}, request) => !match.type ||
  matchValue(match.type, request.params && request.params.type)
const matchScope = ({match = {}}, {params = {}}) => !match.scope ||
  matchValue(match.scope, params.id ? (Array.isArray(params.id) ? 'members' : 'member') : 'collection')
const matchAction = ({match = {}}, request) => !match.action ||
  matchValue(match.action, request.action)
const matchParams = ({match = {}}, request) => !match.params ||
  Object.keys(match.params)
    .every((param) => !match.params[param] || hasParam(request.params, param))

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
