import { nanoid } from 'nanoid'
import pProgress from 'p-progress'
import debugLib from 'debug'
import setupGetService from './utils/getService.js'
import { setErrorOnAction, setResponseOnAction } from './utils/action.js'
import type {
  Dispatch,
  InternalDispatch,
  HandlerDispatch,
  Middleware,
  Action,
  ActionHandler,
  ActionHandlerResources,
  GetService,
  HandlerOptions,
} from './types.js'
import type { Service } from './service/types.js'
import type { Schema } from './schema/index.js'
import type { Endpoint } from './service/endpoints/types.js'

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

function mapIncomingAction(
  action: Action,
  getService: GetService
): { action: Action; service?: Service; endpoint?: Endpoint } {
  const { sourceService } = action.payload
  if (sourceService) {
    const service = getService(undefined, sourceService)
    if (!service) {
      return {
        action: setErrorOnAction(
          action,
          `Source service '${sourceService}' not found`,
          'badrequest'
        ),
      }
    }
    const endpoint = service.endpointFromAction(action, true)
    if (!endpoint) {
      return {
        action: setErrorOnAction(
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
  response: { status, ...response } = {},
  meta: { ident } = {},
}: Action) => ({ ...response, status, access: { ident } })

function setIds(action: Action): Action {
  const id = action.meta?.id || nanoid()
  const cid = action.meta?.cid || id

  return { ...action, meta: { ...action.meta, id, cid } }
}

const wrapDispatch =
  (internalDispatch: InternalDispatch, getService: GetService): Dispatch =>
  (action: Action | null) =>
    pProgress(async (setProgress) => {
      if (!action) {
        return { status: 'noaction', error: 'Dispatched no action' }
      }

      const actionWithIds = setIds(action)

      // Map incoming request data when needed
      const {
        action: mappedAction,
        service,
        endpoint,
      } = mapIncomingAction(actionWithIds, getService)
      // Return any error from mapIncomingRequest()
      if (mappedAction.response?.status) {
        return responseFromAction(
          mapIncomingResponse(mappedAction, service, endpoint)
        )
      }

      // Dispatch
      const p = internalDispatch(mappedAction)
      p.onProgress(setProgress)
      const responseAction = await p

      // Map respons data when needed
      return responseFromAction(
        mapIncomingResponse(responseAction, service, endpoint)
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
  meta: { ...meta, dispatchedAt: Date.now() },
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
    return setErrorOnAction(
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
    pProgress<Action>(async (setProgress) => {
      debug('Dispatch: %o', action)

      // Refuse attempt to dispatch a QUEUE action, as it would never stop being
      // sent to queue.
      if (action.type === 'QUEUE') {
        return setErrorOnAction(action, 'No handler for QUEUE action')
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
          return response
        } else {
          // Send action through middleware before sending to the relevant
          // handler
          const next = async (action: Action) =>
            handleAction(action.type, action, resources, handlers)
          const { response } = await middlewareFn(next)(nextAction)
          return setResponseOnAction(nextAction, response)
        }
      } catch (err) {
        return setErrorOnAction(action, `Error thrown in dispatch: ${err}`)
      }
    })

  return wrapDispatch(internalDispatch, getService)
}
