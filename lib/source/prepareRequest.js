const getEndpoint = require('../utils/getEndpoint')
const authorizeRequest = require('./authorizeRequest')
const authorizeItems = require('./authorizeItems')

function prepareRequest (request, {auth = null, endpoints = [], datatypes = {}, prepareEndpoint} = {}) {
  const {action, headers = {}, uri, params = {}, access = {}} = request
  const {type} = params
  const {ident = {}} = access
  const typePlural = (datatypes[type] && datatypes[type].plural) || (type && `${type}s`)

  let {endpoint} = request
  if (!endpoint || typeof endpoint === 'string') {
    const matchedEndpoint = getEndpoint(endpoints, request)
    endpoint = matchedEndpoint && matchedEndpoint.options
  } else {
    endpoint = prepareEndpoint(endpoint)
  }

  const req = authorizeRequest(
    {
      action,
      type,
      data: request.data,
      endpoint,
      uri,
      params: {
        typePlural,
        ident: ident && ident.id,
        ...params
      },
      headers,
      auth: request.auth || auth,
      access
    },
    datatypes
  )

  return {...req, ...authorizeItems(req, datatypes)}
}

module.exports = prepareRequest
