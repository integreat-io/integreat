import debugLib = require('debug')
import appendToAction from '../utils/appendToAction'
import createUnknownServiceError from '../utils/createUnknownServiceError'

const debug = debugLib('great')

const hasCollectionEndpoint = endpoints =>
  endpoints.some(
    endpoint => endpoint.match && endpoint.match.scope === 'members'
  )

const isErrorResponse = response =>
  response.status !== 'ok' && response.status !== 'notfound'

const getIndividualItems = async (ids: string[], action, getService) => {
  const responses = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    ids.map((id: string) => get(appendToAction(action, { id }), { getService }))
  )
  return responses.some(isErrorResponse)
    ? {
        status: 'error',
        error: `One or more of the requests for ids ${ids} failed.`
      }
    : {
        status: 'ok',
        data: responses.map(response =>
          Array.isArray(response.data) ? response.data[0] : response.data
        )
      }
}

const getIdFromPayload = ({ id }) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

/**
 * Get several items from a service, based on the given action object.
 * @param action - payload and ident from the action object
 * @param resources - Object with getService
 * @returns Array of data from the service
 */
async function get(action, { getService } = {}) {
  const {
    type,
    service: serviceId = null,
    onlyMappedValues = false,
    endpoint
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

  return response
}

export default get
