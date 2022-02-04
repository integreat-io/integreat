const getPluralType = (type, schemas) =>
  (schemas[type] && schemas[type].plural) || (type && `${type}s`)

/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function requestFromAction(
  { type: action, payload, meta = {} },
  { endpoint, schemas = {}, auth } = {}
) {
  const { data, ...params } = payload
  const { ident = null, id } = meta
  const typePlural = getPluralType(params.type, schemas)

  return {
    action,
    params,
    data,
    endpoint: (endpoint && endpoint.options) || null,
    auth,
    access: { ident },
    meta: {
      id,
      typePlural,
    },
  }
}

module.exports = requestFromAction
