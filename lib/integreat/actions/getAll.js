const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get all items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (payload, {sources, types} = {}) {
  debug('Action: GET_ALL')
  if (!payload) {
    debug('GET_ALL: No payload')
    return {status: 'error', error: 'No payload'}
  }
  if (!sources) {
    debug('GET_ALL: No sources')
    return {status: 'error', error: 'No sources'}
  }
  const sourceId = payload.source || sourceIdFromType(payload.type, types)
  const source = sources[sourceId]

  const {type, mappedValuesOnly} = payload

  debug('GET_ALL: Fetch from source %s at endpoint \'all\'', source.id)
  return await source.retrieve({
    endpoint: 'all',
    params: payload,
    type,
    mappedValuesOnly
  })
}

module.exports = getAll
