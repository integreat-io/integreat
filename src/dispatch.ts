import debugLib = require('debug')
import setupGetService from './utils/getService'
import {
  Dictionary,
  Dispatch,
  InternalDispatch,
  Exchange,
  IdentConfig,
  Middleware,
  Action,
} from './types'
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

export interface ActionHandler {
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

function getActionHandlerFromType(
  type: string | undefined,
  actionHandlers: Dictionary<ActionHandler>
) {
  if (type) {
    // eslint-disable-next-line security/detect-object-injection
    const actionHandler = actionHandlers[type]
    if (typeof actionHandler === 'function') {
      return actionHandler
    }
  }
  return undefined
}

const wrapDispatch = (internalDispatch: InternalDispatch): Dispatch =>
  async function dispatch(action: Action | null) {
    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }
    const isRev = action.type === 'REQUEST'
    const exchange = await internalDispatch(exchangeFromAction(action, isRev))
    return responseFromExchange(exchange, isRev)
  }

interface Resources {
  actionHandlers: Dictionary<ActionHandler>
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
  actionHandlers = {},
  schemas = {},
  services = {},
  middlewares = [],
  identConfig,
}: Resources) {
  const getService = setupGetService(schemas, services)
  let internalDispatch: InternalDispatch

  internalDispatch = async (exchange: Exchange) => {
    debug('Dispatch: %o', exchange)

    const handler = getActionHandlerFromType(exchange.type, actionHandlers)
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
