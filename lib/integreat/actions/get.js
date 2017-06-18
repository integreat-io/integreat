const debug = require('debug')('great')
const sourceIdFromType = require('../../utils/sourceIdFromType')

/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} resources - Object with sources and types
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, {sources, types} = {}) {
  debug('Action: Get')
  const {payload} = action
  const sourceId = action.source || sourceIdFromType(payload.type, types)
  const source = sources[sourceId]

  debug('Fetch from source %s at endpoint %s \'one\'', source.id)
  return await source.retrieve({
    endpoint: 'one',
    params: payload,
    type: payload.type
  })
}

module.exports = get
