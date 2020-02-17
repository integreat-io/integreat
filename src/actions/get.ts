import debugLib = require('debug')
import pPipe = require('p-pipe')
import createUnknownServiceError from '../utils/createUnknownServiceError'
import {
  exchangeFromAction,
  responseFromExchange,
  responseToExchange
} from '../utils/exchangeMapping'
import { Action, Exchange, Dispatch, Response } from '../types'
import { Endpoint } from '../service/endpoints/types'
import { GetService } from '../dispatch'

const debug = debugLib('great')

const isErrorResponse = (response: Response) =>
  response.status !== 'ok' && response.status !== 'notfound'

// TODO: Combine exchanges instead of taken the extra trip with responses
const combineResponses = (responses: Response[], ids?: string | string[]) =>
  responses.some(isErrorResponse)
    ? {
        status: 'error',
        error: `One or more of the requests for ids ${ids} failed.`
      }
    : {
        status: 'ok',
        data: responses.map(response =>
          Array.isArray(response.data) ? response.data[0] : response.data
        )
      }

const isMembersScope = (endpoint?: Endpoint) =>
  endpoint?.match?.scope === 'members'

const getIdFromExchange = ({ request: { id } }: Exchange) =>
  Array.isArray(id) && id.length === 1 ? id[0] : id

const setIdOnExchange = (exchange: Exchange, id?: string | string[]) => ({
  ...exchange,
  request: { ...exchange.request, id }
})

const combineExchanges = (exchange: Exchange, exchanges: Exchange[]) =>
  responseToExchange(
    exchange,
    combineResponses(
      exchanges.map(exchange => responseFromExchange(exchange)),
      getIdFromExchange(exchange)
    )
  )

/**
 * Get several items from a service, based on the given action object.
 * @param action - payload and ident from the action object
 * @param resources - Object with getService
 * @returns Array of data from the service
 */
export default async function get(
  obsoleteAction: Action,
  _dispatch: Dispatch,
  getService: GetService
): Promise<Response> {
  const exchange = exchangeFromAction(obsoleteAction)
  const {
    request: { type, service: serviceId },
    endpointId
  } = exchange

  // const onlyMappedValues = false // TODO: Figure out how and if to set this

  const service =
    typeof getService === 'function' ? getService(type, serviceId) : null
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'GET')
  }

  const id = getIdFromExchange(exchange)

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching type '${type}' and id '${id}'`
  debug('GET: Fetch from service %s at %s', service.id, endpointDebug)

  const mapPerId = pPipe<Exchange, Exchange, Exchange, Exchange>(
    service.mapToService,
    service.sendExchange,
    service.mapFromService
  )

  const mapOneOrMany = async (exchange: Exchange): Promise<Exchange> =>
    Array.isArray(id) &&
    exchange.authorized &&
    !isMembersScope(exchange.endpoint)
      ? combineExchanges(
          exchange,
          await Promise.all(
            id.map(oneId =>
              mapPerId(
                service.assignEndpointMapper(setIdOnExchange(exchange, oneId))
              )
            )
          )
        )
      : mapPerId(exchange)

  const nextExchange = await pPipe<Exchange, Exchange, Exchange, Exchange>(
    service.authorizeExchange,
    service.assignEndpointMapper,
    mapOneOrMany
  )(setIdOnExchange(exchange, id))

  return responseFromExchange(nextExchange)
}
