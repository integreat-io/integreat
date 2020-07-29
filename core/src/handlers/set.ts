import debugLib = require('debug')
import pPipe = require('p-pipe')
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
    endpoint,
  } = exchange

  const type = extractType(exchange, data)
  const id = extractId(data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(exchange, type, serviceId, 'SET')
  }

  const endpointDebug = endpoint ? `at endpoint '${endpoint}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  return pPipe(
    service.authorizeExchange,
    service.assignEndpointMapper,
    service.mapRequest,
    service.sendExchange,
    service.mapResponse
  )(setIdAndTypeOnExchange(exchange, id, type))
}
