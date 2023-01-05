const debug = require('debug')('great')
const appendToAction = require('../utils/appendToAction')
const createUnknownServiceError = require('../utils/createUnknownServiceError')

const hasCollectionEndpoint = (endpoints) =>
  endpoints.some(
    (endpoint) => endpoint.match && endpoint.match.scope === 'members'
  )

const getIndividualItems = async (ids, action, getService) => {
  const responses = await Promise.all(
    ids.map((id) => get(appendToAction(action, { id }), { getService }))
  )
  if (
    responses.some(
      (response) => response.status !== 'ok' && response.status !== 'notfound'
    )
  ) {
    return {
      status: 'error',
      error: `One or more of the requests for ids ${ids} failed.`,
    }
  }
  return {
    status: 'ok',
    data: responses.reduce(
      (data, response) => [...data, ...[].concat(response.data)],
      []
    ),
  }
}

const getIdFromData = (data) =>
  Array.isArray(data)
    ? data.length === 1 && data[0]
      ? data[0].id
      : undefined
    : data
    ? data.id
    : undefined

const getIdFromPayload = ({ id, data }) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id ? id : getIdFromData(data)

function filterResponseData(data, id) {
  if (!id || !Array.isArray(data)) {
    return data
  }
  const ids = [].concat(id)
  return data.filter((data) => ids.includes(data.id))
}

/**
 * Get several items from a service, based on the given action object.
 * @param {Object} action - payload and ident from the action object
 * @param {Object} resources - Object with getService
 * @returns {array} Array of data from the service
 */
async function get(action, { getService } = {}) {
  const {
    type,
    service: serviceId = null,
    onlyMappedValues = false,
    endpoint,
    filterWithId = false,
  } = action.payload

  const service =
    typeof getService === 'function' ? getService(type, serviceId) : null
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'GET')
  }

  const id = getIdFromPayload(action.payload)

  // Do individual gets for array of ids, if there is no collection scoped endpoint
  if (Array.isArray(id) && !hasCollectionEndpoint(service.endpoints)) {
    return getIndividualItems(id, action, getService)
  }

  const endpointDebug = endpoint
    ? `endpoint '${endpoint}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const { response } = await service.send(
    appendToAction(action, { id, onlyMappedValues })
  )

  return filterWithId
    ? {
        ...response,
        data: filterResponseData(response.data, id),
      }
    : response
}

module.exports = get
