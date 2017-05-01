/**
 * Get all items from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Source} sources - Source object
 * @returns {Promise} Promise of the data from the source
 */
async function getAll (action, source) {
  const endpoint = source.getEndpoint('all', action.payload)
  return await source.fetchItems(endpoint)
}

module.exports = getAll
