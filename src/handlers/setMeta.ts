import debugLib = require('debug')
import { createErrorOnAction } from '../utils/createError.js'
import { Action, ActionHandlerResources } from '../types.js'
import setHandler from './set.js'
import { generateMetaId } from './getMeta.js'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 */
export default async function setMeta(
  action: Action,
  resources: ActionHandlerResources
): Promise<Action> {
  const {
    payload: {
      type,
      meta = {},
      metaKey,
      targetService: serviceId,
      endpoint: endpointId,
    },
    meta: { ident } = {},
  } = action
  const metaId = generateMetaId(serviceId, type, metaKey as string | undefined)
  const { getService } = resources

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createErrorOnAction(action, `Service '${serviceId}' doesn't exist`)
  }

  const metaType = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(metaType)
  if (!metaService) {
    debug(
      `SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`
    )
    return createErrorOnAction(
      action,
      `Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`,
      'noaction'
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
    endpointDebug
  )

  const setAction = {
    type: 'SET',
    payload: {
      id: metaId,
      type: metaType,
      data: {
        id: metaId,
        $type: metaType,
        ...(meta as Record<string, unknown>),
      },
      sendNoDefaults: true,
      keys: Object.keys(meta as Record<string, unknown>),
      endpoint: endpointId,
    },
    meta: { ident },
  }
  const response = await setHandler(setAction, resources)

  return {
    ...action,
    response: response.response,
  }
}
