const matchValue = (match, value) =>
  (Array.isArray(match)) ? match.includes(value) : (match === value)

const hasParam = (params, param) => params && params[param] !== undefined

const matchId = (endpoint, { payload }) =>
  !payload.endpoint || endpoint.id === payload.endpoint

const matchType = ({ match = {} }, { payload }) =>
  !match.type || matchValue(match.type, payload.type)

const matchScope = ({ match = {} }, { payload }) =>
  !match.scope ||
  matchValue(match.scope, payload.id
    ? (Array.isArray(payload.id) ? 'members' : 'member') : 'collection')

const matchAction = ({ match = {} }, { type }) =>
  !match.action || matchValue(match.action, type)

const matchParams = ({ match = {} }, { payload }) =>
  !match.params ||
  Object.keys(match.params)
    .every((param) => !match.params[param] || hasParam(payload, param))

const matchFilters = (
  { match = {} },
  { payload: { data, ...params }, meta }
) =>
  !match.filters ||
  match.filters.every((filter) => filter({ data, params, meta }))

/**
 * Return the first matching endpoint from an array of endpoints that has
 * already been sortert with higher specificity first. Type should match before
 * scope, which should match before action, but the order here is taken care of
 * by the required sorting.
 *
 * @param {Object[]} endpoints - Array of endpoint objects
 * @param {Object} action - Action object to match agains
 * @returns {Object} Matching endpoint
 */
function matchEndpoint (endpoints) {
  return ({ type, payload, meta }) => endpoints
    .find((endpoint) =>
      matchId(endpoint, { type, payload }) &&
      matchType(endpoint, { type, payload }) &&
      matchScope(endpoint, { type, payload }) &&
      matchAction(endpoint, { type, payload }) &&
      matchParams(endpoint, { type, payload }) &&
      matchFilters(endpoint, { type, payload, meta }))
}

export default matchEndpoint
