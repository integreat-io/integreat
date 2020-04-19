import debugLib = require('debug')
import pPipe = require('p-pipe')
import createError from '../utils/createError'
import { Exchange, InternalDispatch, DataObject, Meta } from '../types'
import { GetService } from '../dispatch'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { completeExchange } from '../utils/exchangeMapping'

const debug = debugLib('great')

const ensureActionType = (serviceId?: string) =>
  function (exchange: Exchange) {
    if (exchange.status || exchange?.endpoint?.options?.actionType) {
      return exchange
    } else {
      return createError(
        exchange,
        `The matching endpoint on service '${serviceId}' did not specify an action type`,
        'noaction'
      )
    }
  }

const exchangeToDispatch = (exchange: Exchange) =>
  completeExchange({
    type: exchange.endpoint?.options.actionType as string,
    request: {
      ...exchange.request,
      type: exchange.request.type,
      ...(exchange.endpoint?.options.actionPayload as DataObject),
      ...exchange.request.params,
      ...(exchange.request.data ? { data: exchange.request.data } : {}),
    },
    ident: exchange.ident,
    meta: {
      ...exchange.meta,
      ...(exchange.endpoint?.options.actionMeta as Meta),
    },
  })

const exchangeToReturn = (exchange: Exchange, response: Exchange) => ({
  ...exchange,
  status: response.status || exchange.status,
  response: response.response || exchange.response,
})

/**
 * Normalize and map a request to an action, and map and serialize its response.
 */
export default async function request(
  exchange: Exchange,
  dispatch: InternalDispatch,
  getService: GetService
): Promise<Exchange> {
  const {
    request: { service: serviceId, type },
    endpoint,
  } = exchange

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(exchange, type, serviceId, 'GET')
  }

  const endpointDebug = endpoint
    ? `endpoint '${endpoint}'`
    : `endpoint matching type '${type}'`
  debug('REQUEST: Fetch from service %s at %s', service.id, endpointDebug)

  const nextExchange = await pPipe<
    Exchange,
    Exchange,
    Exchange,
    Exchange,
    Exchange
  >(
    service.authorizeExchange,
    service.assignEndpointMapper,
    ensureActionType(serviceId),
    service.mapResponse
  )(exchange)

  if (nextExchange.status) {
    return nextExchange
  }

  const responseExchange = await dispatch(exchangeToDispatch(nextExchange))

  return service.mapRequest(exchangeToReturn(nextExchange, responseExchange))
}
