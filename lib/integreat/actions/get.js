const debug = require('debug')('great')

/**
 * Get several items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {array} Array of data from the source
 */
async function get (payload, {getSource} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {type, mappedValuesOnly, source: sourceId, endpoint = 'get'} = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('GET: Fetch from source %s at endpoint \'%s\'', source.id, endpoint)
  return await source.retrieve({
    endpoint,
    params: payload,
    type,
    mappedValuesOnly
  })
}

module.exports = get
