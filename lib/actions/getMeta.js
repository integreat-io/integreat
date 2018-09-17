const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareMeta = (keys, meta) => (keys)
  ? [].concat(keys)
    .filter((key) => key !== 'createdAt' && key !== 'updatedAt')
    .reduce((ret, key) =>
      ({ ...ret, [key]: meta[key] || null }), {})
  : prepareMeta(Object.keys(meta), meta)

const sendMetaRequest = async (service, params, endpoint, ident, serviceId) => {
  const request = {
    action: 'GET',
    params,
    endpoint,
    access: { ident }
  }
  const { response } = await service.send(request)

  if (response.status === 'ok') {
    const { data } = response
    const meta = prepareMeta(params.keys, data[0].attributes)
    return { ...response, data: { service: serviceId, meta } }
  } else {
    return response
  }
}

/**
 * Get metadata for a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Promise} Promise of metdata
 */
async function getMeta ({ payload, ident }, { getService }) {
  debug('Action: GET_META')

  if (!payload) {
    debug('GET_META: No payload')
    return createError('No payload')
  }

  const {
    service: serviceId,
    endpoint,
    keys
  } = payload
  const id = `meta:${serviceId}`

  const service = getService(null, serviceId)
  if (!service) {
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta
  const metaService = getService(type)
  if (!metaService) {
    return createError(`Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`)
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('GET_META: Get meta %s for service \'%s\' on service \'%s\' at %s',
    keys, service.id, metaService.id, endpointDebug)

  return sendMetaRequest(metaService, { keys, type, id }, endpoint, ident, serviceId)
}

module.exports = getMeta
