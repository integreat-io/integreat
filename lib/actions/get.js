const debug = require('debug')('great')
const createError = require('../utils/createError')

const hasCollectionEndpoint = (endpoints) =>
  endpoints.some((endpoint) => endpoint.match && endpoint.match.scope === 'members')

const getIndividualItems = async (ids, payload, ident, getService) => {
  const responses = await Promise.all(ids.map((id) => get({ payload: { ...payload, id }, ident }, { getService })))
  if (responses.some((response) => response.status !== 'ok' && response.status !== 'notfound')) {
    return { status: 'error', error: `One or more of the requests for ids ${ids} failed.` }
  }
  return { status: 'ok', data: responses.map((response) => response.data && response.data[0]) }
}

const getIdFromPayload = ({ id }) =>
  (Array.isArray(id) && id.length === 1) ? id[0] : id

/**
 * Get several items from a service, based on the given action object.
 * @param {Object} action - payload and ident from the action object
 * @param {Object} resources - Object with getService
 * @returns {array} Array of data from the service
 */
async function get ({ payload, ident }, { getService } = {}) {
  debug('Action: GET')
  if (!payload) {
    debug('GET: No payload')
    return createError('No payload')
  }

  const {
    type,
    service: serviceId = null,
    onlyMappedValues = false,
    endpoint
  } = payload

  const service = (typeof getService === 'function') ? getService(type, serviceId) : null
  if (!service) {
    debug('GET: No service')
    return { status: 'error', error: 'No service' }
  }

  const id = getIdFromPayload(payload)

  // Do individual gets for array of ids, if there is no collection scoped endpoint
  if (Array.isArray(id) && !hasCollectionEndpoint(service.endpoints)) {
    return getIndividualItems(id, payload, ident, getService)
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const action = {
    type: 'GET',
    payload: { ...payload, type, id },
    meta: { ident }
  }
  const { response } = await service.send(action, { onlyMappedValues })
  return response
}

module.exports = get
