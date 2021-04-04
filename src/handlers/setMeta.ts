import debugLib = require('debug')
import createError from '../utils/createError'
import { DataObject, Action, InternalDispatch } from '../types'
import { GetService } from '../dispatch'
import setHandler from './set'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 */
export default async function setMeta(
  action: Action,
  dispatch: InternalDispatch,
  getService: GetService
): Promise<Action> {
  const {
    payload: {
      params: { meta = {} } = {},
      targetService: serviceId,
      endpoint: endpointId,
    },
    meta: { ident } = {},
  } = action
  const id = `meta:${serviceId}`

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createError(action, `Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(type)
  if (!metaService) {
    debug(
      `SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`
    )
    return createError(
      action,
      `Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`,
      'noaction'
    )
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching ${type} and ${id}`
  debug(
    "SET_META: Send metadata %o for service '%s' on service '%s' %s",
    meta,
    service.id,
    metaService.id,
    endpointDebug
  )

  const setAction = {
    type: 'SET',
    payload: {
      id,
      type,
      data: { id, $type: type, ...(meta as DataObject) },
      sendNoDefaults: true,
      params: {
        keys: Object.keys(meta as DataObject),
      },
      endpoint: endpointId,
    },
    meta: { ident },
  }
  return setHandler(setAction, dispatch, getService)
}
