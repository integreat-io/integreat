const debug = require('debug')('great')

/**
 * Get several items from a source, based on the given action object.
 * The items will be normalized, but not mapped. Any `path` on the endpoint
 * will be followed, though.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {array} Array of data from the source
 */
async function getUnmapped ({payload, ident}, {getSource} = {}) {
  debug('Action: GET_UNMAPPED')
  if (!payload) {
    debug('GET_UNMAPPED: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    id,
    type = null,
    source: sourceId = null,
    endpoint,
    params = {}
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET_UNMAPPED: No source')
    return {status: 'error', error: 'No source'}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET_UNMAPPED: Fetch from source %s at %s', source.id, endpointDebug)

  const request = {
    action: 'GET',
    endpoint,
    params: {type, id, ...params},
    access: {ident}
  }
  const {response} = await source.send(request, {unmapped: true})
  return response
}

module.exports = getUnmapped
