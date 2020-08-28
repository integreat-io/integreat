import util = require('util')
import debugLib = require('debug')
import createError from '../utils/createError'
import { Exchange, DataObject, InternalDispatch, Data } from '../types'
import { GetService } from '../dispatch'
import getHandler from './get'
import { isDataObject } from '../utils/is'
import { exchangeFromAction } from '../utils/exchangeMapping'

const debug = debugLib('great')

const isMetaField = (key: string) => key !== 'id' && !key.startsWith('$')
const extractAllMetaFields = (meta: DataObject) =>
  Object.keys(meta).filter(isMetaField)

const extractMeta = (meta: Data, keys: unknown): DataObject =>
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

/**
 * Get metadata for a service, based on the given action object.
 */
export default async function getMeta(
  exchange: Exchange,
  dispatch: InternalDispatch,
  getService: GetService
): Promise<Exchange> {
  debug('Action: GET_META')

  const {
    request: { params: { keys = undefined } = {} },
    target: serviceId,
    endpointId,
    ident,
  } = exchange
  const id = `meta:${serviceId}`

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`GET_META: Service '${serviceId}' doesn't exist`)
    return createError(exchange, `Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(type)
  if (!metaService) {
    return createError(
      exchange,
      `Service '${
        service.id
      }' doesn't support metadata (setting was '${util.inspect(service.meta)}')`
    )
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
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
    payload: { keys, type, id, endpoint: endpointId },
    meta: { ident: ident },
  }
  const responseExchange = await getHandler(
    exchangeFromAction(action),
    dispatch,
    getService
  )

  if (responseExchange.status === 'ok') {
    const { data } = responseExchange.response
    const meta = extractMeta(data, keys)
    return {
      ...responseExchange,
      response: {
        ...responseExchange.response,
        data: { service: serviceId, meta },
      },
    }
  } else {
    return responseExchange
  }
}
