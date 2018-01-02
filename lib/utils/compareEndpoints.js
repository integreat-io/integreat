const hasType = (endpoint) => !!endpoint.type
const hasScope = (endpoint) => !!endpoint.scope
const hasAction = (endpoint) => !!endpoint.action

module.exports = (a, b) =>
  (hasType(b) - hasType(a)) ||
  (hasScope(b) - hasScope(a)) ||
  (hasAction(b) - hasAction(a))
