/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Source} source - Source object
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, source) {
  const endpoint = source.getEndpointOne(action.payload)
  return await source.fetchItems(endpoint)
}

module.exports = get
