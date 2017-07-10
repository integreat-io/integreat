const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get all items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (payload, {sources, types} = {}) {
  debug('Action: Get all')
  const sourceId = payload.source || sourceIdFromType(payload.type, types)
  const source = sources[sourceId]

  debug('Fetch from source %s at endpoint \'all\'', source.id)
  return await source.retrieve({
    endpoint: 'all',
    params: payload,
    type: payload.type
  })
}

module.exports = getAll
