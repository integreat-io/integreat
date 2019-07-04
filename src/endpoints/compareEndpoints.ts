const has = (prop) => !!prop
const hasArray = (prop) => Array.isArray(prop) && prop.length
const hasParams = (endpoint, required) => !!endpoint.params && Object.keys(endpoint.params)
  .filter(key => endpoint.params[key] === required).length
const hasFilters = (endpoint) => Array.isArray(endpoint.filters) && endpoint.filters.length

module.exports = (a, b) => {
  const matchA = a.match || {}
  const matchB = b.match || {}

  return (has(a.id) - has(b.id)) ||

    (has(matchB.type) - has(matchA.type)) ||
    (hasArray(matchA.type) - hasArray(matchB.type)) ||

    (hasParams(matchB, true) - hasParams(matchA, true)) ||
    (hasParams(matchB, false) - hasParams(matchA, false)) ||

    (hasFilters(matchB) - hasFilters(matchA)) ||

    (has(matchB.scope) - has(matchA.scope)) ||
    (hasArray(matchA.scope) - hasArray(matchB.scope)) ||

    (has(matchB.action) - has(matchA.action)) ||
    (hasArray(matchA.action) - hasArray(matchB.action))
}
