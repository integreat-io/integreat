import debugLib = require('debug')
import setupGetService from './utils/getService'
import {
  Dictionary,
  Dispatch,
  Action,
  Response,
  IdentConfig,
  Middleware
} from './types'

const debug = debugLib('great')

const compose = (...fns) => fns.reduce((f, g) => (...args) => f(g(...args)))

export interface ActionHandler {
  (
    action: Action,
    dispatch: Dispatch,
    getService: Function,
    identConfig?: IdentConfig
  ): Promise<Response>
}

const completeAction = ({ type, payload = {}, meta = {} }: Action) => ({
  type,
  payload,
  meta
})

function getActionHandlerFromType(
  type: string | undefined,
  actionHandlers: Dictionary<ActionHandler>
) {
  if (type) {
    const actionHandler = actionHandlers[type]
    if (typeof actionHandler === 'function') {
      return actionHandler
    }
  }
  return undefined
}

interface Resources {
  actionHandlers: Dictionary<ActionHandler>
  schemas: object
  services: object
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
  identConfig
}: Resources) {
  const getService = setupGetService(schemas, services)
  let dispatch: Dispatch

  dispatch = async action => {
    debug('Dispatch: %o', action)

    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }

    const handler = getActionHandlerFromType(action.type, actionHandlers)
    if (!handler) {
      return { status: 'noaction', error: 'Dispatched unknown action' }
    }

    return handler(completeAction(action), dispatch, getService, identConfig)
  }

  if (middlewares.length > 0) {
    dispatch = compose(...middlewares)(dispatch)
  }

  return dispatch
}
