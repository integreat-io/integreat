const debug = require('debug')('great')

/**
 * Get from a source, based on the given payload.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {Promise} Promise of the data from the source
 */
async function get (payload, {getSource} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {type, mappedValuesOnly, source: sourceId} = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  debug('GET: Fetch from source %s at endpoint %s \'one\'', source.id)
  return await source.retrieve({
    endpoint: 'one',
    params: payload,
    type,
    mappedValuesOnly
  })
}

module.exports = get
