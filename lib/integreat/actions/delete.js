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
    source: sourceId,
    endpoint = 'delete',
    params = {}
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('DELETE: No source')
    return createError('No source')
  }

  // Map data and add the delete property afterwards
  const mappedData = await source.mapToSource(data)
  const deleteData = [].concat(mappedData).map((item) => Object.assign({delete: true}, item))

  debug('DELETE: Delete from source \'%s\' at endpoint \'%s\'.', source.id, endpoint)
  // Already mapped, so call sendSerialized directly
  return source.sendSerialized({
    endpoint,
    params: Object.assign({type, data, source: sourceId}, params),
    data: deleteData,
    method: 'POST'
  })
}

module.exports = deleteFn
