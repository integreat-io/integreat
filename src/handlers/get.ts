import debugLib = require('debug')
import pPipe = require('p-pipe')
import pLimit = require('p-limit')
import createError from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { Exchange, InternalDispatch } from '../types'
import { IdentConfig, Service } from '../service/types'
import { Endpoint } from '../service/endpoints/types'
import { GetService } from '../dispatch'

const debug = debugLib('great')
const limit = pLimit(1)

const isErrorExchange = (exchange: Exchange) =>
  exchange.status !== 'ok' && exchange.status !== 'notfound'

const getIdFromExchange = ({ request: { id } }: Exchange) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

const combineExchanges = (exchange: Exchange, exchanges: Exchange[]) =>
  exchanges.some(isErrorExchange)
    ? createError(
        exchange,
        `One or more of the requests for ids ${getIdFromExchange(
          exchange
        )} failed.`
      )
    : {
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: exchanges.map((exchange) =>
            Array.isArray(exchange.response.data)
              ? exchange.response.data[0]
              : exchange.response.data
          ),
        },
      }

const isMembersScope = (endpoint?: Endpoint) =>
  endpoint?.match?.scope === 'members'

const setIdOnExchange = (exchange: Exchange, id?: string | string[]) => ({
  ...exchange,
  request: { ...exchange.request, id },
})

const createNoEndpointError = (exchange: Exchange, serviceId: string) =>
  createError(
    exchange,
    `No endpoint matching ${exchange.type} request to service '${serviceId}'.`,
    'noaction'
  )

async function runAsIndividualExchanges(
  exchange: Exchange,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (exchange: Exchange) => Promise<Exchange>
) {
  const exchanges = (exchange.request.id as string[]).map((oneId) =>
    setIdOnExchange(exchange, oneId)
  )
  const endpoint = service.endpointFromExchange(exchanges[0])
  if (!endpoint) {
    return createNoEndpointError(exchange, service.id)
  }
  return combineExchanges(
    exchange,
    await Promise.all(
      exchanges.map((exchange) => limit(() => mapPerId(endpoint)(exchange)))
    )
  )
}

const doRunIndividualIds = (exchange: Exchange, endpoint?: Endpoint) =>
  Array.isArray(exchange.request.id) &&
  exchange.authorized &&
  !isMembersScope(endpoint)

async function mapOneOrMany(
  exchange: Exchange,
  service: Service,
  mapPerId: (endpoint: Endpoint) => (exchange: Exchange) => Promise<Exchange>
): Promise<Exchange> {
  const endpoint = service.endpointFromExchange(exchange)
  if (doRunIndividualIds(exchange, endpoint)) {
    return runAsIndividualExchanges(exchange, service, mapPerId)
  }
  if (!endpoint) {
    return createNoEndpointError(exchange, service.id)
  }

  return mapPerId(endpoint)(exchange)
}

/**
 * Get several items from a service, based on the given action object.
 */
export default async function get(
  exchange: Exchange,
  _dispatch: InternalDispatch,
  getService: GetService,
  _identConfig?: IdentConfig
): Promise<Exchange> {
  const {
    request: { type },
    target: serviceId,
    endpointId,
  } = exchange

  const service =
    typeof getService === 'function' ? getService(type, serviceId) : null
  if (!service) {
    return createUnknownServiceError(exchange, type, serviceId, 'GET')
  }

  const id = getIdFromExchange(exchange)

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const nextExchange = setIdOnExchange(exchange, id)

  const mapPerId = (endpoint: Endpoint) =>
    pPipe(
      (exchange: Exchange) => service.mapRequest(exchange, endpoint),
      service.sendExchange,
      (exchange: Exchange) => service.mapResponse(exchange, endpoint)
    )

  return mapOneOrMany(
    service.authorizeExchange(nextExchange),
    service,
    mapPerId
  )
}
