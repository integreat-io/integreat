const has = (prop) => !!prop
const hasArray = (prop) => Array.isArray(prop) && prop.length
const hasParams = (endpoint, required) => !!endpoint.params && Object.keys(endpoint.params)
  .filter(key => endpoint.params[key] === required).length

module.exports = (a, b) =>
  (has(a.id) - has(b.id)) ||

  (has(b.type) - has(a.type)) ||
  (hasArray(a.type) - hasArray(b.type)) ||

  (hasParams(b, true) - hasParams(a, true)) ||
  (hasParams(b, false) - hasParams(a, false)) ||

  (has(b.scope) - has(a.scope)) ||
  (hasArray(a.scope) - hasArray(b.scope)) ||

  (has(b.action) - has(a.action)) ||
  (hasArray(a.action) - hasArray(b.action))
