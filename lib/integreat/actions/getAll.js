const debug = require('debug')('great')

/**
 * Get all items from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} sources - Sources object
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (action, sources) {
  debug('Action: Get all')
  const source = sources[action.source]
  const {payload} = action

  debug('Fetch from source %s at endpoint \'all\'', source.id)
  return await source.retrieve({
    endpoint: 'all',
    params: payload,
    type: payload.type
  })
}

module.exports = getAll
