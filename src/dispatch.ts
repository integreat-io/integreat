import debugLib = require('debug')
import PProgress = require('p-progress')
import setupGetService from './utils/getService'
import {
  Dispatch,
  InternalDispatch,
  HandlerDispatch,
  Middleware,
  Action,
  ActionHandler,
  ActionHandlerResources,
  GetService,
  HandlerOptions,
} from './types'
import { Service } from './service/types'
import { Schema } from './schema'
import { createErrorOnAction } from './utils/createError'
import { Endpoint } from './service/endpoints/types'
import { isObject } from './utils/is'

const debug = debugLib('great')

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args))
  )

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

const exploadParams = ({
  payload: { params, ...payload } = {},
  ...action
}: Action) => ({
  ...action,
  payload: {
    ...(isObject(params) ? params : {}),
    ...payload,
  },
})

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

const wrapDispatch =
  (internalDispatch: InternalDispatch, getService: GetService): Dispatch =>
  (action: Action | null) =>
    new PProgress(async (resolve, _reject, setProgress) => {
      if (!action) {
        resolve({ status: 'noaction', error: 'Dispatched no action' })
        return
      }

      // Map incoming request data when needed
      const {
        action: mappedAction,
        service,
        endpoint,
      } = mapIncomingAction(exploadParams(action), getService)
      // Return any error from mapIncomingRequest()
      if (mappedAction.response?.status) {
        resolve(
          responseFromAction(
            mapIncomingResponse(mappedAction, service, endpoint)
          )
        )
        return
      }

      // Dispatch
      const p = internalDispatch(mappedAction)
      p.onProgress(setProgress)
      const responseAction = await p

      // Map respons data when needed
      resolve(
        responseFromAction(
          mapIncomingResponse(responseAction, service, endpoint)
        )
      )
    })

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

async function handleAction(
  handlerType: string,
  action: Action,
  resources: ActionHandlerResources,
  handlers: Record<string, ActionHandler>
) {
  // Find handler ...
  const handler = getActionHandlerFromType(handlerType, handlers)
  if (!handler) {
    return createErrorOnAction(
      action,
      `No handler for ${handlerType} action`,
      'badrequest'
    )
  }

  // ... and pass it the action
  return await handler(action, resources)
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
  options,
}: Resources): Dispatch {
  const getService = setupGetService(schemas, services)
  const middlewareFn =
    middleware.length > 0
      ? compose(...middleware)
      : (next: HandlerDispatch) => async (action: Action) => next(action)

  const internalDispatch = (action: Action) =>
    new PProgress<Action>(async (resolve, _reject, setProgress) => {
      debug('Dispatch: %o', action)

      // Refuse attempt to dispatch a QUEUE action, as it would never stop being
      // sent to queue.
      if (action.type === 'QUEUE') {
        resolve(createErrorOnAction(action, 'No handler for QUEUE action'))
        return
      }

      const nextAction = prepareAction(action)
      const resources: ActionHandlerResources = {
        dispatch: internalDispatch,
        getService,
        options,
        setProgress,
      }

      try {
        if (shouldQueue(action, options)) {
          // Use queue handler if queue flag is set and there is a queue
          // service. Bypass middleware
          const response = await handleAction(
            'QUEUE',
            nextAction,
            resources,
            handlers
          )
          resolve(response)
        } else {
          // Send action through middleware before sending to the relevant
          // handler
          const next = async (action: Action) =>
            handleAction(action.type, action, resources, handlers)
          const response = await middlewareFn(next)(nextAction)
          resolve({ ...nextAction, response: response.response })
        }
      } catch (err) {
        resolve(createErrorOnAction(action, `Error thrown in dispatch: ${err}`))
      }
    })

  return wrapDispatch(internalDispatch, getService)
}
