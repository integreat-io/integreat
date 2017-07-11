const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function get (payload, {sources, types} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }
  if (!sources) {
    debug('GET: No sources')
    return {status: 'error', error: 'No sources'}
  }
  const sourceId = payload.source || sourceIdFromType(payload.type, types)
  const source = sources[sourceId]

  debug('GET: Fetch from source %s at endpoint %s \'one\'', source.id)
  return await source.retrieve({
    endpoint: 'one',
    params: payload,
    type: payload.type
  })
}

module.exports = get
