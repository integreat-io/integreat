const debug = require('debug')('great')
const createError = require('../../utils/createError')

/**
 * Delete one item from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Object} Response object with any data returned from the source
 */
function deleteOne (payload, {getSource} = {}) {
  debug('Action: DELETE_ONE')
  if (!payload) {
    debug('DELETE_ONE: No payload')
    return createError('No payload')
  }

  const {
    id,
    type,
    source: sourceId,
    endpoint = 'deleteOne',
    params = {}
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('DELETE_ONE: No source')
    return createError('No source')
  }

  debug('DELETE_ONE: Delete from source \'%s\' at endpoint \'%s\'.', source.id, endpoint)
  return source.send({
    endpoint,
    params: Object.assign({id, type}, params),
    method: 'DELETE'
  })
}

module.exports = deleteOne
