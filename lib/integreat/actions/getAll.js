const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get all items from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (action, {sources, types} = {}) {
  debug('Action: Get all')
  const {payload} = action
  const sourceId = action.source || sourceIdFromType(payload.type, types)
  const source = sources[sourceId]

  debug('Fetch from source %s at endpoint \'all\'', source.id)
  return await source.retrieve({
    endpoint: 'all',
    params: payload,
    type: payload.type
  })
}

module.exports = getAll
