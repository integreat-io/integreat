const debug = require('debug')('great')
const createError = require('../utils/createError')

/**
 * Set several items to a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Object} Response object with any data returned from the service
 */
async function set ({ payload, ident }, { getService, schemas }) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return createError('No payload')
  }

  const { service: serviceId, data, params, endpoint, useDefaults = false } = payload
  const type = payload.type || data.type
  const id = data.id
  const service = getService(type, serviceId)

  if (!service) {
    debug(`SET: No service for type '${type}' or with id '${serviceId}'`)
    return createError(`No service for type '${type}' or with id '${serviceId}'`)
  }

  const endpointDebug = (endpoint) ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const request = {
    action: 'SET',
    endpoint,
    params: { id, type, ...params },
    data,
    access: { ident }
  }
  const { response, request: authorizedRequest } = await service.send(request, { useDefaults })

  return (response.status === 'ok') ? { ...response, data: [].concat(authorizedRequest.data) } : response
}

module.exports = set
