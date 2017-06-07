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
  const {uri, path} = source.getEndpoint('all', payload)
  debug('Fetch from source %s at %s', source.id, uri)
  const data = await source.retrieve(uri)
  return await source.mapFromSource(data, payload.type, path)
}

module.exports = getAll
