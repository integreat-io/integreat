const createEndpoint = ({uri, id, path, method, type, scope, action}) => ({
  id,
  type,
  scope,
  action,
  options: {uri, path, method}
})

module.exports = createEndpoint
