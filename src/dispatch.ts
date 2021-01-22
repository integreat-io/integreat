import debugLib = require('debug')
import setupGetService from './utils/getService'
import {
  Dispatch,
  InternalDispatch,
  Exchange,
  Middleware,
  Action,
} from './types'
import { IdentConfig } from './service/types'
import {
  exchangeFromAction,
  responseFromExchange,
} from './utils/exchangeMapping'
import { Service } from './service/types'
import { Schema } from './schema'
import createError from './utils/createError'
import { Endpoint } from './service/endpoints/types'

const debug = debugLib('great')

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce((f, g) => (...args) => f(g(...args)))

export interface GetService {
  (type?: string | string[], serviceId?: string): Service | undefined
}

export interface ExchangeHandler {
  (
    exchange: Exchange,
    dispatch: InternalDispatch,
    getService: GetService,
    identConfig?: IdentConfig
  ): Promise<Exchange>
}

function getExchangeHandlerFromType(
  type: string | undefined,
  handlers: Record<string, ExchangeHandler>
) {
  if (type) {
    // eslint-disable-next-line security/detect-object-injection
    const handler = handlers[type]
    if (typeof handler === 'function') {
      return handler
    }
  }
  return undefined
}

const setErrorOnExchange = (exchange: Exchange, error: string) => ({
  exchange: createError(exchange, error, 'badrequest'),
})

function mapIncomingRequest(
  exchange: Exchange,
  getService: GetService
): { exchange: Exchange; service?: Service; endpoint?: Endpoint } {
  if (exchange.source) {
    const service = getService(undefined, exchange.source)
    if (!service) {
      return setErrorOnExchange(
        exchange,
        `Source service '${exchange.source}' not found`
      )
    }
    const endpoint = service.endpointFromExchange(exchange, true)
    if (!endpoint) {
      return setErrorOnExchange(
        exchange,
        `No matching endpoint for incoming mapping on service '${exchange.source}'`
      )
    }
    return {
      exchange: service.mapRequest(exchange, endpoint, true),
      service,
      endpoint,
    }
  }
  return { exchange }
}

const mapIncomingResponse = (
  exchange: Exchange,
  service?: Service,
  endpoint?: Endpoint
) =>
  service && endpoint ? service.mapResponse(exchange, endpoint, true) : exchange

const wrapDispatch = (
  internalDispatch: InternalDispatch,
  getService: GetService
): Dispatch =>
  async function dispatch(action: Action | null) {
    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }

    // Map incoming request data when needed
    const { exchange, service, endpoint } = mapIncomingRequest(
      exchangeFromAction(action),
      getService
    )
    // Return any error from mapIncomingRequest()
    if (exchange.status) {
      return responseFromExchange(exchange)
    }

    // Dispatch
    const responseExchange = await internalDispatch(exchange)

    return responseFromExchange(
      // Map respons data when needed
      mapIncomingResponse(responseExchange, service, endpoint)
    )
  }

export interface Resources {
  handlers: Record<string, ExchangeHandler>
  schemas: Record<string, Schema>
  services: Record<string, Service>
  middleware?: Middleware[]
  identConfig?: IdentConfig
}

/**
 * Setup and return dispatch function. The dispatch function map the action to
 *  an exchange and will pass it on the any middleware before sending it to the
 * relevant action handler. When an action has a specified `source` service, any
 * action data will be mapped as incoming from that service before the
 * middleware, and will be mapped back to that service in the response.
 */
export default function createDispatch({
  handlers = {},
  schemas = {},
  services = {},
  middleware = [],
  identConfig,
}: Resources): Dispatch {
  const getService = setupGetService(schemas, services)
  let internalDispatch: InternalDispatch

  internalDispatch = async function <T = unknown>(
    exchange: Exchange<unknown, T>
  ) {
    debug('Dispatch: %o', exchange)

    const handler = getExchangeHandlerFromType(exchange.type, handlers)
    if (!handler) {
      return createError(exchange, 'Dispatched unknown action', 'noaction')
    }

    return handler(exchange, internalDispatch, getService, identConfig)
  }

  if (middleware.length > 0) {
    internalDispatch = compose(...middleware)(internalDispatch)
  }

  return wrapDispatch(internalDispatch, getService)
}
