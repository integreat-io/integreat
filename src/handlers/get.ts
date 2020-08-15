import debugLib = require('debug')
import pPipe = require('p-pipe')
import pLimit from 'p-limit'
import createError from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { Exchange, InternalDispatch } from '../types'
import { Service, IdentConfig } from '../service/types'
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

async function runAsIndividualExchanges(
  exchange: Exchange,
  id: string[],
  mapPerId: (exchange: Exchange) => Promise<Exchange>,
  service: Service
) {
  const exchanges = id.map((oneId) => setIdOnExchange(exchange, oneId))
  return combineExchanges(
    exchange,
    await Promise.all(
      exchanges.map((exchange) =>
        limit(() => mapPerId(service.assignEndpointMapper(exchange)))
      )
    )
  )
}

const mapOneOrMany = (
  id: string | string[] | undefined,
  mapPerId: (exchange: Exchange) => Promise<Exchange>,
  service: Service
) => async (exchange: Exchange): Promise<Exchange> =>
  Array.isArray(id) && exchange.authorized && !isMembersScope(exchange.endpoint)
    ? runAsIndividualExchanges(exchange, id, mapPerId, service)
    : mapPerId(exchange)

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
    request: { type, service: serviceId },
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

  const mapPerId = pPipe(
    service.mapRequest,
    service.sendExchange,
    service.mapResponse
  )

  return pPipe(
    service.authorizeExchange,
    service.assignEndpointMapper,
    mapOneOrMany(id, mapPerId, service)
  )(setIdOnExchange(exchange, id))
}
