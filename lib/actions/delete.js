const debug = require('debug')('great')
const appendToAction = require('../utils/appendToAction')
const createError = require('../utils/createError')
const createUnknownServiceError = require('../utils/createUnknownServiceError')

const prepareData = (payload) => {
  const { type, id } = payload

  if (type && id) {
    // Delete one action -- return as data
    return [{ id, type }]
  } else {
    // Filter away null values
    return [].concat(payload.data)
      .filter((item) => !!item)
  }
}

/**
 * Delete several items from a service, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Object} Response object with any data returned from the service
 */
async function deleteFn (action, { getService } = {}) {
  debug('Action: DELETE')
  const { type, id, service: serviceId, endpoint } = action.payload

  const service = (typeof getService === 'function') ? getService(type, serviceId) : null
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'DELETE')
  }

  const data = prepareData(action.payload)
  if (data.length === 0) {
    return createError(`No items to delete from service '${service.id}'`, 'noaction')
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('DELETE: Delete from service \'%s\' at %s.', service.id, endpointDebug)

  const { response } = await service.send(appendToAction(action, { data }))

  return (response.status === 'ok') ? { status: 'ok' } : response
}

module.exports = deleteFn
