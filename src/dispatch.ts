import debugLib = require('debug')
import setupGetService from './utils/getService'
import {
  Dictionary,
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
import { ObjectWithId } from './utils/indexUtils'
import createError from './utils/createError'

const debug = debugLib('great')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

export interface ExchangeHandler {
  (
    exchange: Exchange,
    dispatch: InternalDispatch,
    getService: Function,
    identConfig?: IdentConfig
  ): Promise<Exchange>
}

export interface GetService {
  (type?: string | string[], serviceId?: string): Service | undefined // TODO: Properly type Service
}

function getExchangeHandlerFromType(
  type: string | undefined,
  handlers: Dictionary<ExchangeHandler>
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

const wrapDispatch = (internalDispatch: InternalDispatch): Dispatch =>
  async function dispatch(action: Action | null) {
    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }
    const exchange = await internalDispatch(exchangeFromAction(action))
    return responseFromExchange(exchange)
  }

interface Resources {
  handlers: Dictionary<ExchangeHandler>
  schemas: Dictionary<Schema>
  services: Dictionary<ObjectWithId> // TODO: Properly type Service
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
}: Resources) {
  const getService = setupGetService(schemas, services)
  let internalDispatch: InternalDispatch

  internalDispatch = async (exchange: Exchange) => {
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

  return wrapDispatch(internalDispatch)
}
