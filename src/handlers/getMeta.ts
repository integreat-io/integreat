import debugLib = require('debug')
import { createErrorOnAction } from '../utils/createError'
import { Action, DataObject, InternalDispatch } from '../types'
import { GetService } from '../dispatch'
import getHandler from './get'
import { isDataObject } from '../utils/is'

const debug = debugLib('great')

const isMetaField = (key: string) => key !== 'id' && !key.startsWith('$')
const extractAllMetaFields = (meta: DataObject) =>
  Object.keys(meta).filter(isMetaField)

const extractMeta = (meta: unknown, keys: unknown): DataObject =>
  isDataObject(meta)
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
  dispatch: InternalDispatch,
  getService: GetService
): Promise<Action> {
  debug('Action: GET_META')

  const {
    payload: {
      type,
      params: { keys = undefined, metaKey } = {},
      targetService: serviceId,
      endpoint: endpointId,
    },
    meta: { ident } = {},
  } = action
  const metaId = generateMetaId(serviceId, type, metaKey as string | undefined)

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createErrorOnAction(action, `Service '${serviceId}' doesn't exist`)
  }

  const metaType = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(metaType)
  if (!metaService) {
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
  const responseAction = await getHandler(nextAction, dispatch, getService)

  if (responseAction.response?.status === 'ok') {
    const { data } = responseAction.response || {}
    const meta = extractMeta(data, keys)
    return {
      ...responseAction,
      response: {
        ...responseAction.response,
        data: { service: serviceId, meta },
      },
    }
  } else {
    return responseAction
  }
}
