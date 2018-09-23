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

  const service = (typeof getService === 'function') ? getService(payload.type, payload.service) : null
  if (!service) {
    debug('DELETE: No service')
    return createError('No service')
  }

  const data = prepareData(payload)
  if (data.length === 0) {
    return createError(`No items to delete from service '${service.id}'`, 'noaction')
  }

  const { endpoint } = payload
  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${payload.type} and ${payload.id}`
  debug('DELETE: Delete from service \'%s\' at %s.', service.id, endpointDebug)

  const action = {
    type: 'DELETE',
    payload: { ...payload, data },
    meta: { ident }
  }
  const { response } = await service.send(action)

  return (response.status === 'ok') ? { status: 'ok' } : response
}

module.exports = deleteFn
