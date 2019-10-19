import debugLib = require('debug')
import createError from '../utils/createError'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 * @param payload - Payload from action object
 * @param resources - Object with getService
 * @returns Promise that will be resolved when metadata is set
 */
async function setMeta({ payload, meta }, _dispatch, getService) {
  debug('Action: SET_META')

  const { service: serviceId, meta: metaAttrs, endpoint } = payload
  const id = `meta:${serviceId}`

  const service = getService(null, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta
  const metaService = getService(type)
  if (!metaService) {
    debug(
      `SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`
    )
    return { status: 'noaction' }
  }

  const endpointDebug = endpoint
    ? `endpoint '${endpoint}'`
    : `endpoint matching ${type} and ${id}`
  debug(
    "SET_META: Send metadata %o for service '%s' on service '%s' %s",
    metaAttrs,
    service.id,
    metaService.id,
    endpointDebug
  )

  const data = { id, $type: type, ...metaAttrs }
  const { response } = await metaService.send({
    type: 'SET',
    payload: {
      keys: Object.keys(metaAttrs),
      type,
      id,
      data,
      endpoint,
      onlyMappedValues: true
    },
    meta: { ident: meta.ident }
  })
  return response
}

export default setMeta
