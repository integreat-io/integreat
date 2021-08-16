import debugLib = require('debug')
import setupGetService from './utils/getService'
import { Dispatch, InternalDispatch, Middleware, Action } from './types'
import { IdentConfig } from './service/types'
import { Service } from './service/types'
import { Schema } from './schema'
import { createErrorOnAction } from './utils/createError'
import { Endpoint } from './service/endpoints/types'

const debug = debugLib('great')

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args))
  )

export interface GetService {
  (type?: string | string[], serviceId?: string): Service | undefined
}

export interface HandlerOptions {
  identConfig?: IdentConfig
  queueService?: string
}

export interface ActionHandler {
  (
    action: Action,
    dispatch: InternalDispatch,
    getService: GetService,
    options: HandlerOptions
  ): Promise<Action>
}

const shouldQueue = (action: Action, options: HandlerOptions) =>
  action.meta?.queue === true && !!options.queueService

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

function mapIncomingAction(
  action: Action,
  getService: GetService
): { action: Action; service?: Service; endpoint?: Endpoint } {
  const { sourceService } = action.payload
  if (sourceService) {
    const service = getService(undefined, sourceService)
    if (!service) {
      return {
        action: createErrorOnAction(
          action,
          `Source service '${sourceService}' not found`,
          'badrequest'
        ),
      }
    }
    const endpoint = service.endpointFromAction(action, true)
    if (!endpoint) {
      return {
        action: createErrorOnAction(
          action,
          `No matching endpoint for incoming mapping on service '${sourceService}'`,
          'badrequest'
        ),
      }
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
    const {
      action: mappedAction,
      service,
      endpoint,
    } = mapIncomingAction(action, getService)
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
  options: HandlerOptions
}

const prepareAction = ({
  payload: { service, ...payload },
  meta: { queue, ...meta } = {},
  ...action
}: Action) => ({
  ...action,
  payload: { ...(service && { targetService: service }), ...payload },
  meta,
})

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
  options,
}: Resources): Dispatch {
  const getService = setupGetService(schemas, services)
  let internalDispatch: InternalDispatch

  internalDispatch = async function (action: Action) {
    debug('Dispatch: %o', action)

    // Refuse attempt to dispatch a QUEUE action, as it would never stop being
    // sent to queue.
    if (action.type === 'QUEUE') {
      return createErrorOnAction(
        action,
        'No handler for QUEUE action',
        'noaction'
      )
    }

    // Use queue handler if queue flag is set and there is a queue service
    const handlerType = shouldQueue(action, options) ? 'QUEUE' : action.type

    // Find handler ...
    const handler = getActionHandlerFromType(handlerType, handlers)
    if (!handler) {
      return createErrorOnAction(
        action,
        `No handler for ${handlerType} action`,
        'noaction'
      )
    }

    // ... and pass it the action
    return handler(prepareAction(action), internalDispatch, getService, options)
  }

  if (middleware.length > 0) {
    internalDispatch = compose(...middleware)(internalDispatch)
  }

  return wrapDispatch(internalDispatch, getService)
}
