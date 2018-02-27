const getEndpoint = require('../utils/getEndpoint')
const authorizeRequest = require('./authorizeRequest')
const authorizeItems = require('./authorizeItems')

function prepareRequest (request, {auth = null, endpoints = [], datatypes = {}, prepareEndpoint, useDefaults = false} = {}) {
  const {action, headers = {}, params = {}, access = {}} = request
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

  const castOne = (item) => (datatypes[item.type]) ? datatypes[item.type].cast(item, {useDefaults}) : item
  const data = (Array.isArray(request.data))
    ? request.data.map(castOne)
    : request.data && castOne(request.data)

  const req = authorizeRequest(
    {
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
    },
    datatypes
  )

  return {...req, ...authorizeItems(req, datatypes)}
}

module.exports = prepareRequest
