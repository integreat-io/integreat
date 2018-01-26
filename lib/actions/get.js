const debug = require('debug')('great')

/**
 * Get several items from a source, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getSource
 * @returns {array} Array of data from the source
 */
async function get (payload, {getSource, ident} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    type,
    source: sourceId = null,
    endpoint,
    useDefaults = true
  } = payload
  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null
  const id = (Array.isArray(payload.id) && payload.id.length === 1) ? payload.id[0] : payload.id
  const params = {...payload.params, id}

  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  // Do individual gets for array of ids, if there is no 'members' scoped endpoint
  if (Array.isArray(id) && !source.endpoints.some((endpoint) => endpoint.scope === 'members')) {
    const responses = await Promise.all(id.map((id) => get({...payload, id}, {getSource})))
    if (responses.some((response) => response.status !== 'ok')) {
      return {status: 'error', error: `One or more of the requests for ids ${id} failed.`}
    }
    return {status: 'ok', data: responses.map((response) => response.data && response.data[0])}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET: Fetch from source %s at %s', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'GET',
    type,
    params,
    endpoint,
    ident
  })
  const response = await source.retrieve(request)

  if (response.status === 'ok') {
    const mappedResponse = source.mapFromSource(response, {type, params, useDefaults})
    return {...response, ...mappedResponse}
  } else {
    return response
  }
}

module.exports = get
