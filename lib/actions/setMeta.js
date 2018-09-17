const debug = require('debug')('great')
const createError = require('../utils/createError')

/**
 * Set metadata on a service, based on the given action object.
 * @param {Object} payload - Payload from action object
 * @param {Object} resources - Object with getService
 * @returns {Promise} Promise that will be resolved when metadata is set
 */
async function setMeta ({ payload, ident }, { getService }) {
  debug('Action: SET_META')

  if (!payload) {
    debug('SET_META: No payload')
    return createError('No payload')
  }

  const {
    service: serviceId,
    meta,
    endpoint
  } = payload
  const id = `meta:${serviceId}`

  const service = getService(null, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta
  const metaService = getService(type)
  if (!metaService) {
    debug(`SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`)
    return { status: 'noaction' }
  }

  const endpointDebug = (endpoint) ? `endpoint '${endpoint}'` : `endpoint matching ${type} and ${id}`
  debug('SET_META: Send metadata %o for service \'%s\' on service \'%s\' %s',
    meta, service.id, metaService.id, endpointDebug)

  const request = {
    action: 'SET',
    endpoint,
    params: { keys: Object.keys(meta), type, id },
    data: { id, type, attributes: meta },
    access: { ident }
  }
  const { response } = await metaService.send(request, { useDefaults: false })
  return response
}

module.exports = setMeta
