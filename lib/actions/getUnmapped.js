const debug = require('debug')('great')

/**
 * Get several items from a service, based on the given action object.
 * The items will be normalized, but not mapped. Any `path` on the endpoint
 * will be followed, though.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {array} Array of data from the service
 */
async function getUnmapped ({payload, ident}, {getService} = {}) {
  debug('Action: GET_UNMAPPED')
  if (!payload) {
    debug('GET_UNMAPPED: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    id,
    type = null,
    service: serviceId = null,
    endpoint,
    params = {}
  } = payload
  const service = (typeof getService === 'function') ? getService(type, serviceId) : null

  if (!service) {
    debug('GET_UNMAPPED: No service')
    return {status: 'error', error: 'No service'}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET_UNMAPPED: Fetch from service %s at %s', service.id, endpointDebug)

  const request = {
    action: 'GET',
    endpoint,
    params: {type, id, ...params},
    access: {ident}
  }
  const {response} = await service.send(request, {unmapped: true})
  return response
}

module.exports = getUnmapped
