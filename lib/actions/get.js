/**
 * Get from a source, based on the given action object.
 * @param {Object} action - Action object with type and payload
 * @param {Sources} sources - Sources object
 * @returns {Promise} Promise of the data from the source
 */
async function get (action, sources) {
  const {payload} = action
  const source = (payload.source)
    ? sources.get(payload.source)
    : sources.getFromType(payload.type)

  try {
    const endpoint = source.getEndpointOne(payload)
    return await source.fetchItems(endpoint)
  } catch (e) {
    return null
  }
}

module.exports = get
