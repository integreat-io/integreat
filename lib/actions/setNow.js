/**
 * Set to a source, based on the given action object.
 * Will always set directly to the source, unlike the set action, which may
 * put the set action in a queue.
 * @param {Object} action - Action object with type and payload
 * @param {Source} source - Source object
 * @returns {Promise} Promise that will be resolved when item is set
 */
async function setNow (action, source) {
  const endpoint = source.getEndpointSend(action.payload)
  return await source.sendItems(action.payload, endpoint)
}

module.exports = setNow
