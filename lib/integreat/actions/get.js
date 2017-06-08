const debug = require('debug')('great')

/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} sources - Sources object
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, sources) {
  debug('Action: Get')
  const source = sources[action.source]
  const {payload} = action

  debug('Fetch from source %s at endpoint %s \'one\'', source.id)
  return await source.retrieve({
    endpoint: 'one',
    params: payload,
    type: payload.type
  })
}

module.exports = get
