const getPluralType = (type, schemas) =>
  (schemas[type] && schemas[type].plural) || (type && `${type}s`) // eslint-disable-line security/detect-object-injection

/**
 * Complete missing props and allow only expected props on the request object.
 * @param request - The request object to complete
 * @returns The completed request object
 */
function requestFromAction(
  { type: action, payload, meta = {} },
  { endpoint, schemas = {} } = {}
) {
  const { data, ...params } = payload
  const { ident = null } = meta
  const typePlural = getPluralType(params.type, schemas)

  return {
    action,
    params,
    data,
    endpoint: (endpoint && endpoint.options) || null,
    access: { ident },
    meta: {
      typePlural
    }
  }
}

export default requestFromAction
