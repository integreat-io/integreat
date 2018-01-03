const has = (prop) => !!prop
const hasArray = (prop) => Array.isArray(prop) && prop.length
const hasParams = (endpoint) => !!endpoint.params && Object.keys(endpoint.params).length

module.exports = (a, b) =>
  (has(b.type) - has(a.type)) ||
  (hasArray(a.type) - hasArray(b.type)) ||

  (has(b.scope) - has(a.scope)) ||
  (hasArray(a.scope) - hasArray(b.scope)) ||

  (has(b.action) - has(a.action)) ||
  (hasArray(a.action) - hasArray(b.action)) ||

  (hasParams(b) - hasParams(a))
