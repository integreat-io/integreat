const debug = require('debug')('great')

/**
 * Get several items from a source, based on the given action object.
 * @param {Object} action - payload and ident from the action object
 * @param {Object} resources - Object with getSource
 * @returns {array} Array of data from the source
 */
async function get ({payload, ident}, {getSource} = {}) {
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
    const responses = await Promise.all(id.map((id) => get({payload: {...payload, id}}, {getSource})))
    if (responses.some((response) => response.status !== 'ok')) {
      return {status: 'error', error: `One or more of the requests for ids ${id} failed.`}
    }
    return {status: 'ok', data: responses.map((response) => response.data && response.data[0])}
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET: Fetch from source %s at %s', source.id, endpointDebug)

  const request = source.prepareRequest({
    action: 'GET',
    params: {type, ...params},
    endpoint,
    access: {ident}
  })
  const response = await source.retrieve(request)

  if (response.status === 'ok') {
    const mappedData = source.mapFromSource(response.data, {type, params, useDefaults})
    return {...response, data: mappedData}
  } else {
    return response
  }
}

module.exports = get
