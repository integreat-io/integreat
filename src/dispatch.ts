import debugLib = require('debug')
import setupGetService from './utils/getService'
import {
  Dispatch,
  InternalDispatch,
  Exchange,
  Middleware,
  Action,
  Data,
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

const compose = (...fns: Middleware[]) =>
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

const wrapDispatch = (
  internalDispatch: InternalDispatch,
  getService: GetService
): Dispatch =>
  async function dispatch(action: Action | null) {
    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }

    let exchange = exchangeFromAction(action)
    let service: Service | undefined = undefined
    let endpoint: Endpoint | undefined = undefined

    if (exchange.source) {
      service = getService(undefined, exchange.source)
      if (service) {
        // TODO: Make endpoint a param instead of setting it on the exchange?
        endpoint = service.endpointFromExchange(exchange)
        exchange = service.mapRequest({ ...exchange, endpoint }, endpoint, true)
      }
    }

    exchange = await internalDispatch(exchange)

    if (service && endpoint) {
      exchange = service.mapResponse({ ...exchange, endpoint }, endpoint, true)
    }

    return responseFromExchange(exchange)
  }

// const internalDispatch = (getService: GetService, handlers: Record<string, ExchangeHandler>, identConfig?: IdentConfig) =>

export interface Resources {
  handlers: Record<string, ExchangeHandler>
  schemas: Record<string, Schema>
  services: Record<string, Service>
  middlewares?: Middleware[]
  identConfig?: IdentConfig
}

/**
 * Setup and return dispatch function. The dispatch function will call the
 * relevant action handler.
 * @param resources - Object with actions, schemas, services, and middlewares
 * @returns Dispatch function, accepting an action as only argument
 */
export default function createDispatch({
  handlers = {},
  schemas = {},
  services = {},
  middlewares = [],
  identConfig,
}: Resources): Dispatch {
  const getService = setupGetService(schemas, services)
  let internalDispatch: InternalDispatch

  internalDispatch = async function <T extends Data = Data>(
    exchange: Exchange<Data, T>
  ) {
    debug('Dispatch: %o', exchange)

    const handler = getExchangeHandlerFromType(exchange.type, handlers)
    if (!handler) {
      return createError(exchange, 'Dispatched unknown action', 'noaction')
    }

    return handler(exchange, internalDispatch, getService, identConfig)
  }

  if (middlewares.length > 0) {
    internalDispatch = compose(...middlewares)(internalDispatch)
  }

  return wrapDispatch(internalDispatch, getService)
}
