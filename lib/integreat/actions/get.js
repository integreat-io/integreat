const debug = require('debug')('great')

/**
 * Get several items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {array} Array of data from the source
 */
async function get (payload, {getSource} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    type,
    id,
    source: sourceId = null,
    endpoint,
    params = {},
    useDefaults = true
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null

  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET: Fetch from source %s at %s', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'GET',
    type,
    id,
    params,
    endpoint
  })
  return source.retrieve(request, {useDefaults})
}

module.exports = get
