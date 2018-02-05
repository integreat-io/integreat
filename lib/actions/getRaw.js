const debug = require('debug')('great')

/**
 * Get raw data from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise of the data from the source
 */
async function getRaw ({payload}, {getSource} = {}) {
  debug('Action: GET_RAW')
  if (!payload) {
    debug('GET_RAW: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {source: sourceId, uri} = payload
  const source = (typeof getSource === 'function') ? getSource(null, sourceId) : null

  if (!source) {
    debug('GET_RAW: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('GET_RAW: Fetch from source %s at uri %s', source.id, uri)
  const request = source.prepareRequest({uri})
  return source.retrieveRaw(request)
}

module.exports = getRaw
