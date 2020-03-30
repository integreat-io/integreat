const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareMeta = (keys, meta) => (keys)
  ? [].concat(keys)
    .filter((key) => key !== 'createdAt' && key !== 'updatedAt')
    .reduce((ret, key) =>
      ({ ...ret, [key]: meta[key] || null }), {})
  : prepareMeta(Object.keys(meta), meta)

/**
 * Get metadata for a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Promise} Promise of metdata
 */
async function getMeta ({ payload, meta }, { getService }) {
  debug('Action: GET_META')

  const { service: serviceId, metaKey, endpoint, keys } = payload
  const id = ['meta', serviceId, metaKey].filter(Boolean).join(':')

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

  const { response } = await metaService.send({
    type: 'GET',
    payload: { keys, type, id, endpoint },
    meta: { ident: meta.ident }
  })

  if (response.status === 'ok' && Array.isArray(response.data) && response.data.length > 0) {
    const { data } = response
    const meta = prepareMeta(keys, data[0].attributes)
    return { ...response, data: { service: serviceId, meta } }
  } else {
    return response
  }
}

module.exports = getMeta
