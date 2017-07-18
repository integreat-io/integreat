const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and datatypes
 * @returns {Promise} Promise of the data from the source
 */
async function get (payload, {sources, datatypes} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }
  if (!sources) {
    debug('GET: No sources')
    return {status: 'error', error: 'No sources'}
  }
  const sourceId = payload.source || sourceIdFromType(payload.type, datatypes)
  const source = sources[sourceId]

  const {type, mappedValuesOnly} = payload

  debug('GET: Fetch from source %s at endpoint %s \'one\'', source.id)
  return await source.retrieve({
    endpoint: 'one',
    params: payload,
    type,
    mappedValuesOnly
  })
}

module.exports = get
