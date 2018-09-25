const getPluralType = (type, schemas) =>
  (schemas[type] && schemas[type].plural) || (type && `${type}s`)

const inferMethod = (actionType) => {
  switch (actionType.split('_')[0]) {
    case 'GET': return 'QUERY'
    case 'SET': return 'MUTATION'
    case 'DELETE': return 'EXTINCTION'
  }
  return 'UNKNOWN'
}

/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function requestFromAction (
  { type: action, payload, meta = {} },
  { endpoint, schemas = {}, authenticator = null } = {}
) {
  const { data, ...params } = payload
  const { ident = null } = meta
  const typePlural = getPluralType(params.type, schemas)

  return {
    method: inferMethod(action),
    params,
    data,
    endpoint: (endpoint && endpoint.options) || null,
    auth: authenticator,
    access: { ident },
    meta: {
      typePlural
    }
  }
}

module.exports = requestFromAction
