import util = require('util')
import debugLib = require('debug')
import createError from '../utils/createError'
import { DataObject, Action, Dispatch, Data } from '../types'
import { GetService } from '../dispatch'
import getHandler from './get'
import { isDataObject } from '../utils/is'

const debug = debugLib('great')

const isMetaField = (key: string) => key !== 'id' && !key.startsWith('$')
const extractAllMetaFields = (meta: DataObject) =>
  Object.keys(meta).filter(isMetaField)

const extractMeta = (meta: Data, keys: unknown): DataObject =>
  isDataObject(meta)
    ? typeof keys === 'string' || Array.isArray(keys)
      ? ([] as string[])
          .concat(keys)
          .filter(key => key !== 'createdAt' && key !== 'updatedAt')
          .reduce(
            // eslint-disable-next-line security/detect-object-injection
            (ret, key) => ({ ...ret, [key]: (meta && meta[key]) || null }),
            {}
          )
      : extractMeta(meta, extractAllMetaFields(meta))
    : {}

/**
 * Get metadata for a service, based on the given action object.
 */
export default async function getMeta(
  { payload, meta }: Action,
  dispatch: Dispatch,
  getService: GetService
) {
  debug('Action: GET_META')

  const { service: serviceId, endpoint, keys } = payload
  const id = `meta:${serviceId}`

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(type)
  if (!metaService) {
    return createError(
      `Service '${
        service.id
      }' doesn't support metadata (setting was '${util.inspect(service.meta)}')`
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

  const action = {
    type: 'GET',
    payload: { keys, type, id, endpoint },
    meta: { ident: meta?.ident }
  }
  const response = await getHandler(action, dispatch, getService)

  if (response.status === 'ok') {
    const { data } = response
    const meta = extractMeta(data, keys)
    return { ...response, data: { service: serviceId, meta } }
  } else {
    return response
  }
}
