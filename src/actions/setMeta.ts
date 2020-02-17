import debugLib = require('debug')
import createError from '../utils/createError'
import { DataObject, Action, Dispatch } from '../types'
import { GetService } from '../dispatch'
import setHandler from './set'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 */
export default async function setMeta(
  { payload, meta }: Action,
  dispatch: Dispatch,
  getService: GetService
) {
  const { service: serviceId, meta: metaAttrs, endpoint } = payload
  const id = `meta:${serviceId}`

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createError(`Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta

  // TODO: Check if the meta service exists - find a better way?
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

  const action = {
    type: 'SET',
    payload: {
      keys: Object.keys(metaAttrs as DataObject),
      type,
      id,
      data: { id, $type: type, ...(metaAttrs as DataObject) },
      endpoint,
      onlyMappedValues: true
    },
    meta: { ident: meta?.ident }
  }
  return setHandler(action, dispatch, getService)
}
