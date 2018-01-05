const debug = require('debug')('great')
const createError = require('../../utils/createError')

const prepareData = (payload) => {
  const {type, id} = payload

  if (type && id) {
    // Delete one action -- return as data
    return [{id, type, delete: true}]
  } else {
    // Filter away null values and add the delete property
    return [].concat(payload.data)
      .filter((item) => !!item)
      .map((item) => ({delete: true, ...item}))
  }
}

const send = (payload, source) => {
  const {id, type, params, endpoint} = payload
  const data = prepareData(payload)

  if (data.length === 0) {
    return createError(`No items to delete from source '${source.id}'`, 'noaction')
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('DELETE: Delete from source \'%s\' at %s.', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'DELETE',
    type,
    id,
    endpoint,
    params,
    data,
    method: (id) ? 'DELETE' : 'POST'
  })
  // Already mapped, so call sendSerialized directly
  return source.sendSerialized(request)
}

/**
 * Delete several items from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
async function deleteFn (payload, {getSource} = {}) {
  debug('Action: DELETE')
  if (!payload) {
    debug('DELETE: No payload')
    return createError('No payload')
  }

  const {type, source: sourceId} = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('DELETE: No source')
    return createError('No source')
  }

  return send(payload, source)
}

module.exports = deleteFn
