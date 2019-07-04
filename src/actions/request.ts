const debug = require('debug')('great')
import createUnknownServiceError from '../utils/createUnknownServiceError'

/**
 * Normalize and map a request to an action, and map and serialize its response.
 * @param {Object} action - The action object
 * @param {Object} resources - Object with getService and dispatch
 * @returns {Object} Response object
 */
async function request(action, { getService, dispatch }) {
  debug('Action: REQUEST')

  const { type, service: serviceId = null, endpoint } = action.payload

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'GET')
  }

  const endpointDebug = endpoint
    ? `endpoint '${endpoint}'`
    : `endpoint matching type '${type}'`
  debug('REQUEST: Fetch from service %s at %s', service.id, endpointDebug)

  const { response } = await service.receive(action, dispatch)

  return response
}

export default request
