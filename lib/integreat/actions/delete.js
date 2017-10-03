const debug = require('debug')('great')
const createError = require('../../utils/createError')

/**
 * Delete several items from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
function deleteFn (payload, {getSource} = {}) {
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

  debug('DELETE: Delete from source \'%s\' at endpoint \'%s\'.', source.id, endpoint)
  return source.send({
    endpoint,
    params: Object.assign({type, data, source: sourceId}, params),
    data,
    method: 'POST'
  })
}

module.exports = deleteFn
