/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function prepareRequest (request, {auth = null, schemas = {}} = {}) {
  const {action, headers = {}, params = {}, access = {}, data, endpoint} = request
  const {type} = params
  const {ident = {}} = access
  const typePlural = (schemas[type] && schemas[type].plural) || (type && `${type}s`)

  return {
    action,
    data,
    endpoint,
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
