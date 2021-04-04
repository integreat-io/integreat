import debugLib = require('debug')
import setupGetService from './utils/getService'
import { Dispatch, InternalDispatch, Middleware, Action } from './types'
import { IdentConfig } from './service/types'
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

export interface ActionHandler {
  (
    action: Action,
    dispatch: InternalDispatch,
    getService: GetService,
    identConfig?: IdentConfig
  ): Promise<Action>
}

function getActionHandlerFromType(
  type: string | undefined,
  handlers: Record<string, ActionHandler>
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

const setErrorOnAction = (action: Action, error: string) => ({
  action: createError(action, error, 'badrequest'),
})

function mapIncomingAction(
  action: Action,
  getService: GetService
): { action: Action; service?: Service; endpoint?: Endpoint } {
  const { sourceService } = action.payload
  if (sourceService) {
    const service = getService(undefined, sourceService)
    if (!service) {
      return setErrorOnAction(
        action,
        `Source service '${sourceService}' not found`
      )
    }
    const endpoint = service.endpointFromAction(action, true)
    if (!endpoint) {
      return setErrorOnAction(
        action,
        `No matching endpoint for incoming mapping on service '${sourceService}'`
      )
    }
    return {
      action: service.mapRequest(action, endpoint, true),
      service,
      endpoint,
    }
  }
  return { action }
}

const mapIncomingResponse = (
  action: Action,
  service?: Service,
  endpoint?: Endpoint
) =>
  service && endpoint ? service.mapResponse(action, endpoint, true) : action

const responseFromAction = ({
  response: { status, ...response } = { status: null },
  meta: { ident } = {},
}: Action) => ({ ...response, status: status || null, access: { ident } })

const wrapDispatch = (
  internalDispatch: InternalDispatch,
  getService: GetService
): Dispatch =>
  async function dispatch(action: Action | null) {
    if (!action) {
      return { status: 'noaction', error: 'Dispatched no action' }
    }

    // Map incoming request data when needed
    const { action: mappedAction, service, endpoint } = mapIncomingAction(
      action,
      getService
    )
    // Return any error from mapIncomingRequest()
    if (mappedAction.response?.status) {
      return responseFromAction(mappedAction)
    }

    // Dispatch
    const responseAction = await internalDispatch(mappedAction)

    // Map respons data when needed
    return responseFromAction(
      mapIncomingResponse(responseAction, service, endpoint)
    )
  }

export interface Resources {
  handlers: Record<string, ActionHandler>
  schemas: Record<string, Schema>
  services: Record<string, Service>
  middleware?: Middleware[]
  identConfig?: IdentConfig
}

/**
 * Setup and return dispatch function. The dispatch function will pass an action
 * through the middleware middleware before sending it to the relevant action
 * handler. When an action has a specified `sourceService`, any action data will
 * be mapped as incoming from that service before the middleware, and will be
 * mapped back to that service in the response.
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

  internalDispatch = async function (action: Action) {
    debug('Dispatch: %o', action)

    const handler = getActionHandlerFromType(action.type, handlers)
    if (!handler) {
      return createError(action, 'Dispatched unknown action', 'noaction')
    }

    return handler(action, internalDispatch, getService, identConfig)
  }

  if (middleware.length > 0) {
    internalDispatch = compose(...middleware)(internalDispatch)
  }

  return wrapDispatch(internalDispatch, getService)
}
