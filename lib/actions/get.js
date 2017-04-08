/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {function} getSource - Function to retrieve a source
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, getSource) {
  const {payload} = action
  const source = getSource(payload.source)
  try {
    const endpoint = source.getEndpointOne(payload)
    return await source.fetchItems(endpoint)
  } catch (e) {
    return null
  }
}

module.exports = get
