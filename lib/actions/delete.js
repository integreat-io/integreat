const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareData = (payload) => {
  const {type, id} = payload

  if (type && id) {
    // Delete one action -- return as data
    return [{id, type}]
  } else {
    // Filter away null values and add the delete property
    return [].concat(payload.data)
      .filter((item) => !!item)
      .map((item) => ({id: item.id, type: item.type}))
  }
}

/**
 * Delete several items from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function deleteFn ({payload}, {getSource} = {}) {
  debug('Action: DELETE')
  if (!payload) {
    debug('DELETE: No payload')
    return createError('No payload')
  }

  const {id, type, source: sourceId, params, endpoint} = payload

  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null
  if (!source) {
    debug('DELETE: No source')
    return createError('No source')
  }

  const data = prepareData(payload)
  if (data.length === 0) {
    return createError(`No items to delete from source '${source.id}'`, 'noaction')
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('DELETE: Delete from source \'%s\' at %s.', source.id, endpointDebug)

  const request = {
    action: 'DELETE',
    endpoint,
    params: {type, id, ...params},
    data
  }
  const {response} = await source.send(request)

  return (response.status === 'ok') ? {status: 'ok'} : response
}

module.exports = deleteFn
