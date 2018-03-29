const debug = require('debug')('great')

const hasCollectionEndpoint = (endpoints) =>
  endpoints.some((endpoint) => endpoint.scope === 'members')

const getIndividualItems = async (ids, payload, getSource) => {
  const responses = await Promise.all(ids.map((id) => get({payload: {...payload, id}}, {getSource})))
  if (responses.some((response) => response.status !== 'ok' && response.status !== 'notfound')) {
    return {status: 'error', error: `One or more of the requests for ids ${ids} failed.`}
  }
  return {status: 'ok', data: responses.map((response) => response.data && response.data[0])}
}

const sendGetRequest = async (source, params, payload, ident) => {
  const {
    useDefaults = true,
    endpoint
  } = payload

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${params.type} and ${params.id}`
  debug('GET: Fetch from source %s at %s', source.id, endpointDebug)

  const request = {
    action: 'GET',
    params,
    endpoint,
    access: {ident}
  }
  const {response} = await source.send(request, {useDefaults})

  return response
}

const getIdFromPayload = ({id}) =>
  (Array.isArray(id) && id.length === 1) ? id[0] : id

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
    source: sourceId = null
  } = payload

  const source = (typeof getSource === 'function') ? getSource(type, sourceId) : null
  if (!source) {
    debug('GET: No source')
    return {status: 'error', error: 'No source'}
  }

  const id = getIdFromPayload(payload)

  // Do individual gets for array of ids, if there is no collection scoped endpoint
  if (Array.isArray(id) && !hasCollectionEndpoint(source.endpoints)) {
    return getIndividualItems(id, payload, getSource)
  }

  return sendGetRequest(source, {type, ...payload.params, id}, payload, ident)
}

module.exports = get
