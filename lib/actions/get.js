const debug = require('debug')('great')

const hasCollectionEndpoint = (endpoints) =>
  endpoints.some((endpoint) => endpoint.scope === 'members')

const getIndividualItems = async (ids, payload, ident, getService) => {
  const responses = await Promise.all(ids.map((id) => get({payload: {...payload, id}, ident}, {getService})))
  if (responses.some((response) => response.status !== 'ok' && response.status !== 'notfound')) {
    return {status: 'error', error: `One or more of the requests for ids ${ids} failed.`}
  }
  return {status: 'ok', data: responses.map((response) => response.data && response.data[0])}
}

const sendGetRequest = async (service, params, payload, ident) => {
  const {
    useDefaults = true,
    endpoint
  } = payload

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${params.type} and ${params.id}`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const request = {
    action: 'GET',
    params,
    endpoint,
    access: {ident}
  }
  const {response} = await service.send(request, {useDefaults})

  return response
}

const getIdFromPayload = ({id}) =>
  (Array.isArray(id) && id.length === 1) ? id[0] : id

/**
 * Get several items from a service, based on the given action object.
 * @param {Object} action - payload and ident from the action object
 * @param {Object} resources - Object with getService
 * @returns {array} Array of data from the service
 */
async function get ({payload, ident}, {getService} = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return {status: 'error', error: 'No payload'}
  }

  const {
    type,
    service: serviceId = null
  } = payload

  const service = (typeof getService === 'function') ? getService(type, serviceId) : null
  if (!service) {
    debug('GET: No service')
    return {status: 'error', error: 'No service'}
  }

  const id = getIdFromPayload(payload)

  // Do individual gets for array of ids, if there is no collection scoped endpoint
  if (Array.isArray(id) && !hasCollectionEndpoint(service.endpoints)) {
    return getIndividualItems(id, payload, ident, getService)
  }

  return sendGetRequest(service, {type, ...payload.params, id}, payload, ident)
}

module.exports = get
