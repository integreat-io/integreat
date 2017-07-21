const debug = require('debug')('great')

/**
 * Get all items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (payload, {getSource} = {}) {
  debug('Action: GET_ALL')
  if (!payload) {
    debug('GET_ALL: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {type, mappedValuesOnly, source: sourceId} = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('GET_ALL: Fetch from source %s at endpoint \'all\'', source.id)
  return await source.retrieve({
    endpoint: 'all',
    params: payload,
    type,
    mappedValuesOnly
  })
}

module.exports = getAll
