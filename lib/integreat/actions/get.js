/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Object} sources - Sources object
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, sources) {
  const source = sources[action.source]
  const endpoint = source.getEndpoint('one', action.payload)
  return await source.fetchItems(endpoint)
}

module.exports = get
