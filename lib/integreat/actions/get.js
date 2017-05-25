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
  const {uri} = source.getEndpoint('one', action.payload)
  debug('Fetch from source %s at %s', source.id, uri)
  return await source.fetchItems(uri)
}

module.exports = get
