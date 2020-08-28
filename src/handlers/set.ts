import debugLib = require('debug')
import pPipe = require('p-pipe')
import createError from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { isTypedData } from '../utils/is'
import { Exchange, InternalDispatch, Data } from '../types'
import { GetService } from '../dispatch'

const debug = debugLib('great')

const extractType = (exchange: Exchange, data?: Data) =>
  exchange.request.type || (isTypedData(data) && data.$type) || undefined

const extractId = (data?: Data) => (isTypedData(data) && data.id) || undefined

const setIdAndTypeOnExchange = (
  exchange: Exchange,
  id?: string | string[],
  type?: string | string[]
) => ({
  ...exchange,
  request: { ...exchange.request, id, type },
})

/**
 * Set several items to a service, based on the given action object.
 */
export default async function set(
  exchange: Exchange,
  _dispatch: InternalDispatch,
  getService: GetService
): Promise<Exchange> {
  const {
    request: { service: serviceId, data },
    endpoint: endpointId,
  } = exchange

  const type = extractType(exchange, data)
  const id = extractId(data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(exchange, type, serviceId, 'SET')
  }

  const endpointDebug = endpointId ? `at endpoint '${endpointId}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const nextExchange = setIdAndTypeOnExchange(exchange, id, type)
  const endpoint = service.endpointFromExchange(nextExchange)
  if (!endpoint) {
    return createError(
      exchange,
      `No endpoint matching ${exchange.type} request to service '${serviceId}'.`,
      'noaction'
    )
  }

  return pPipe(
    service.authorizeExchange,
    (exchange: Exchange) => service.mapRequest(exchange, endpoint),
    service.sendExchange,
    (exchange: Exchange) => service.mapResponse(exchange, endpoint)
  )(nextExchange)
}
