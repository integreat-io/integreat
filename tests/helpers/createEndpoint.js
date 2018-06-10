const createEndpoint = ({uri, id, path, method, type, scope, action, match, options, mapping}) => ({
  id,
  match: match || {type, scope, action},
  mapping,
  options: options || {uri, path, method}
})

module.exports = createEndpoint
