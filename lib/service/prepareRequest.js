/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function prepareRequest (request, { auth = null, schemas = {}, endpoint } = {}) {
  const { action, headers = {}, params = {}, access = {}, data } = request
  const { type } = params
  const { ident = {} } = access
  const typePlural = (schemas[type] && schemas[type].plural) || (type && `${type}s`)

  return {
    action,
    data,
    endpoint: endpoint && endpoint.options,
    params: {
      typePlural,
      ident: ident && ident.id,
      ...params
    },
    headers,
    auth: request.auth || auth,
    access
  }
}

module.exports = prepareRequest
