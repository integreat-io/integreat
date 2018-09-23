const getPluralType = (type, schemas) =>
  (schemas[type] && schemas[type].plural) || (type && `${type}s`)

/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function prepareRequest ({ type: action, payload, meta = {} }, { auth = null, schemas = {}, endpoint } = {}) {
  const { data, ...params } = payload
  const { ident = null } = meta
  const typePlural = getPluralType(params.type, schemas)

  return {
    action,
    data,
    endpoint: endpoint && endpoint.options,
    params: {
      typePlural,
      ident: ident && ident.id,
      ...params
    },
    headers: {},
    auth,
    access: { ident }
  }
}

module.exports = prepareRequest
