const getEndpoint = require('../utils/getEndpoint')

const matchEndpoint = (request, endpoints, prepareEndpoint) => {
  const {endpoint} = request

  if (!endpoint || typeof endpoint === 'string') {
    const matchedEndpoint = getEndpoint(endpoints, request)
    return matchedEndpoint && matchedEndpoint.options
  }

  return endpoint
}

/**
 * Complete missing props and allow only expected props on the request object.
 * @param {Object} request - The request object to complete
 * @returns {Object} The completed request object
 */
function prepareRequest (request, {auth = null, endpoints = [], schemas = {}, useDefaults = false} = {}) {
  const {action, headers = {}, params = {}, access = {}, data} = request
  const {type} = params
  const {ident = {}} = access
  const typePlural = (schemas[type] && schemas[type].plural) || (type && `${type}s`)

  const endpoint = matchEndpoint(request, endpoints)

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
