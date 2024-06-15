import debugLib from 'debug'
import { createErrorResponse } from '../utils/response.js'
import setHandler from './set.js'
import { generateMetaId } from './getMeta.js'
import type { Action, Response, ActionHandlerResources } from '../types.js'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 */
export default async function setMeta(
  action: Action,
  resources: ActionHandlerResources,
): Promise<Response> {
  const {
    payload: {
      type,
      meta = {},
      metaKey,
      targetService: serviceId,
      endpoint: endpointId,
    },
  } = action
  const metaId = generateMetaId(serviceId, type, metaKey as string | undefined)
  const { getService } = resources

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createErrorResponse(
      `Service '${serviceId}' doesn't exist`,
      'handler:SET_META',
    )
  }

  const metaType = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(metaType)
  if (!metaService) {
    debug(
      `SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`,
    )
    return createErrorResponse(
      `Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`,
      'handler:SET_META',
      'noaction',
    )
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching ${metaType} and ${metaId}`
  debug(
    "SET_META: Send metadata %o for service '%s' on service '%s' %s",
    meta,
    service.id,
    metaService.id,
    endpointDebug,
  )

  const setAction = {
    ...action,
    payload: {
      id: metaId,
      type: metaType,
      data: {
        id: metaId,
        $type: metaType,
        ...(meta as Record<string, unknown>),
      },
      keys: Object.keys(meta as Record<string, unknown>),
      endpoint: endpointId,
    },
  }
  return await setHandler(setAction, resources)
}
