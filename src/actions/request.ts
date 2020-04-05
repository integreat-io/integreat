import debugLib = require('debug')
import pPipe = require('p-pipe')
import { responseToExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'
import { Exchange, Dispatch, Payload, Meta } from '../types'
import { GetService } from '../dispatch'
import createUnknownServiceError from '../utils/createUnknownServiceError'

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

const createNextAction = (exchange: Exchange) => ({
  type: exchange.endpoint?.options.actionType as string,
  payload: {
    type: exchange.request.type,
    ...(exchange.endpoint?.options.actionPayload as Payload),
    ...exchange.response.params,
    ...(exchange.response.data ? { data: exchange.response.data } : {}),
  },
  meta: {
    ...exchange.meta,
    ident: exchange.ident,
    ...(exchange.endpoint?.options.actionMeta as Meta),
  },
})

/**
 * Normalize and map a request to an action, and map and serialize its response.
 */
export default async function request(
  exchange: Exchange,
  dispatch: Dispatch,
  getService: GetService
): Promise<Exchange> {
  const isRev = true
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

  // const { response } = await service.receive(action, dispatch)

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
    service.mapFromService
  )(exchange)

  if (nextExchange.status) {
    return nextExchange
  }

  const nextAction = createNextAction(nextExchange)
  const response = await dispatch(nextAction)
  return service.mapToService(responseToExchange(nextExchange, response, isRev))
}
