import debugLib = require('debug')
import createError from '../utils/createError'
import { completeExchange } from '../utils/exchangeMapping'
import { DataObject, Exchange, InternalDispatch } from '../types'
import { GetService } from '../dispatch'
import setHandler from './set'

const debug = debugLib('great')

/**
 * Set metadata on a service, based on the given action object.
 */
export default async function setMeta(
  exchange: Exchange,
  dispatch: InternalDispatch,
  getService: GetService
): Promise<Exchange> {
  const {
    request: { service: serviceId, params: { meta = {} } = {} },
    endpointId,
    ident,
  } = exchange
  const id = `meta:${serviceId}`

  const service = getService(undefined, serviceId)
  if (!service) {
    debug(`SET_META: Service '${serviceId}' doesn't exist`)
    return createError(exchange, `Service '${serviceId}' doesn't exist`)
  }

  const type = service.meta

  // TODO: Check if the meta service exists - find a better way?
  const metaService = getService(type)
  if (!metaService) {
    debug(
      `SET_META: Service '${service.id}' doesn't support metadata (setting was '${service.meta}')`
    )
    return createError(
      exchange,
      `Service '${serviceId}' doesn't support metdata`,
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

  const setExchange = completeExchange({
    type: 'SET',
    request: {
      id,
      type,
      data: { id, $type: type, ...(meta as DataObject) },
      sendNoDefaults: true,
      params: {
        keys: Object.keys(meta as DataObject),
      },
    },
    endpointId,
    ident,
  })
  return setHandler(setExchange, dispatch, getService)
}
