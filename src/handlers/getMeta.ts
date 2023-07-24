import debugLib from 'debug'
import { createErrorResponse, setOrigin } from '../utils/action.js'
import getHandler from './get.js'
import { isObject } from '../utils/is.js'
import type { Action, Response, ActionHandlerResources } from '../types.js'

const debug = debugLib('great')

const isMetaField = (key: string) => key !== 'id' && !key.startsWith('$')
const extractAllMetaFields = (meta: Record<string, unknown>) =>
  Object.keys(meta).filter(isMetaField)

const extractMeta = (meta: unknown, keys: unknown): Record<string, unknown> =>
  isObject(meta)
    ? typeof keys === 'string' || Array.isArray(keys)
      ? ([] as string[])
          .concat(keys)
          .filter((key) => key !== 'createdAt' && key !== 'updatedAt')
          .reduce(
            // eslint-disable-next-line security/detect-object-injection
            (ret, key) => ({ ...ret, [key]: (meta && meta[key]) || null }),
            {}
          )
      : extractMeta(meta, extractAllMetaFields(meta))
    : {}

const joinTypes = (types?: string | string[]) =>
  Array.isArray(types) ? types.join('|') : types

export const generateMetaId = (
  serviceId?: string,
  type?: string | string[],
  metaKey?: string
): string =>
  ['meta', serviceId, joinTypes(type), metaKey].filter(Boolean).join(':')

/**
 * Get metadata for a service, based on the given action object.
 */
export default async function getMeta(
  action: Action,
  resources: ActionHandlerResources
): Promise<Response> {
  debug('Action: GET_META')

  const {
    payload: {
      type,
      keys = undefined,
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
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createErrorResponse(
      `Service '${serviceId}' doesn't exist`,
      'handler:GET_META'
    )
  }

  const metaType = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(metaType)
  if (!metaService) {
    return createErrorResponse(
      `Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`,
      'handler:GET_META',
      'noaction'
    )
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching ${metaType} and ${metaId}`
  debug(
    "GET_META: Get meta %s for service '%s' on service '%s' at %s",
    keys,
    service.id,
    metaService.id,
    endpointDebug
  )

  const nextAction = {
    type: 'GET',
    payload: { keys, type: metaType, id: metaId, endpoint: endpointId },
    meta: { ident: ident },
  }
  const response = await getHandler(nextAction, resources)

  if (response?.status === 'ok') {
    const { data } = response || {}
    const meta = extractMeta(data, keys)
    return {
      status: 'ok',
      data: { service: serviceId, meta },
    }
  } else {
    return setOrigin(response, 'handler:GET_META')
  }
}
