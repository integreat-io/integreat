import debugLib = require('debug')
import createError from '../utils/createError'
import { DataObject } from '../types'

const debug = debugLib('great')

const isMetaField = (key: string) => key !== 'id' && !key.startsWith('$')
const extractAllMetaFields = (meta: DataObject) =>
  Object.keys(meta).filter(isMetaField)

const extractMeta = (meta: DataObject, keys?: string[]) =>
  keys
    ? ([] as string[])
        .concat(keys)
        .filter(key => key !== 'createdAt' && key !== 'updatedAt')
        .reduce(
          // eslint-disable-next-line security/detect-object-injection
          (ret, key) => ({ ...ret, [key]: (meta && meta[key]) || null }),
          {}
        )
    : extractMeta(meta, extractAllMetaFields(meta))

/**
 * Get metadata for a service, based on the given action object.
 * @param payload - Payload from action object
 * @param resources - Object with getService
 * @returns Promise of metdata
 */
async function getMeta({ payload, meta }, { getService }) {
  debug('Action: GET_META')

  const { service: serviceId, endpoint, keys } = payload
  const id = `meta:${serviceId}`

  const service = getService(null, serviceId)
  if (!service) {
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta
  const metaService = getService(type)
  if (!metaService) {
    return createError(
      `Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`
    )
  }

  const endpointDebug = endpoint
    ? `endpoint '${endpoint}'`
    : `endpoint matching ${type} and ${id}`
  debug(
    "GET_META: Get meta %s for service '%s' on service '%s' at %s",
    keys,
    service.id,
    metaService.id,
    endpointDebug
  )

  const { response } = await metaService.send({
    type: 'GET',
    payload: { keys, type, id, endpoint },
    meta: { ident: meta.ident }
  })

  if (response.status === 'ok') {
    const { data } = response
    const meta = extractMeta(data, keys)
    return { ...response, data: { service: serviceId, meta } }
  } else {
    return response
  }
}

export default getMeta
