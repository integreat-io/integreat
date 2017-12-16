const debug = require('debug')('great')
const createError = require('../../utils/createError')

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

  const {
    data,
    type,
    id,
    source: sourceId,
    endpoint,
    params = {}
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('DELETE: No source')
    return createError('No source')
  }

  // Filter away null values and add the delete property
  const deleteData = [].concat(data)
    .filter((item) => !!item)
    .map((item) => ({delete: true, ...item}))

  if (deleteData.length === 0) {
    if (type && id) {
      deleteData.push({id, type, delete: true})
    } else {
      return createError(`No items to delete from source '${source.id}'`, 'noaction')
    }
  }

  const endpointId = endpoint || ((id) ? 'deleteOne' : 'delete')
  debug('DELETE: Delete from source \'%s\' at endpoint \'%s\'.', source.id, endpointId)
  // Already mapped, so call sendSerialized directly
  return source.sendSerialized({
    endpoint: endpointId,
    params: {type, id, data, source: sourceId, ...params},
    data: deleteData,
    method: (id) ? 'DELETE' : 'POST'
  })
}

module.exports = deleteFn
