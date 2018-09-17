const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareData = (payload) => {
  const { type, id } = payload

  if (type && id) {
    // Delete one action -- return as data
    return [{ id, type }]
  } else {
    // Filter away null values and add the delete property
    return [].concat(payload.data)
      .filter((item) => !!item)
      .map((item) => ({ id: item.id, type: item.type }))
  }
}

const sendDeleteRequest = async (service, payload, data, ident) => {
  const { type, id, params, endpoint } = payload
  const request = {
    action: 'DELETE',
    endpoint,
    params: { type, id, ...params },
    data,
    access: { ident }
  }
  const { response } = await service.send(request)

  return (response.status === 'ok') ? { status: 'ok' } : response
}

/**
 * Delete several items from a service, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Object} Response object with any data returned from the service
 */
async function deleteFn ({ payload, ident }, { getService } = {}) {
  debug('Action: DELETE')
  if (!payload) {
    debug('DELETE: No payload')
    return createError('No payload')
  }

  const { type, id, service: serviceId, endpoint } = payload

  const service = (typeof getService === 'function') ? getService(type, serviceId) : null
  if (!service) {
    debug('DELETE: No service')
    return createError('No service')
  }

  const data = prepareData(payload)
  if (data.length === 0) {
    return createError(`No items to delete from service '${service.id}'`, 'noaction')
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('DELETE: Delete from service \'%s\' at %s.', service.id, endpointDebug)

  return sendDeleteRequest(service, payload, data, ident)
}

module.exports = deleteFn
