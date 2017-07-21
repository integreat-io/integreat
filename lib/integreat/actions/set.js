const debug = require('debug')('great')

/**
 * Set to a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise that will be resolved when item is set
 */
async function set (payload, {getSource} = {}) {
  debug('Action: SET')
  if (!payload) {
    debug('SET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {data, source: sourceId, endpoint = 'send'} = payload
  const source = (typeof getSource === 'function') ? getSource(data.type, sourceId) : null

  if (!source) {
    debug('SET: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('SET: Send to source %s at endpoint \'%s\'', source.id, endpoint)
  return await source.send({endpoint, params: data, data})
}

module.exports = set
