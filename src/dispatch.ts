import { nanoid } from 'nanoid'
import pProgress from 'p-progress'
import debugLib from 'debug'
import { QUEUE_SYMBOL } from './handlers/index.js'
import setupGetService from './utils/getService.js'
import {
  setErrorOnAction,
  createErrorResponse,
  setResponseOnAction,
  setOrigin,
} from './utils/action.js'
import type {
  Dispatch,
  HandlerDispatch,
  Middleware,
  Action,
  Response,
  Ident,
  ActionHandler,
  ActionHandlerResources,
  GetService,
  HandlerOptions,
} from './types.js'
import type Service from './service/Service.js'
import type Schema from './schema/Schema.js'
import type Endpoint from './service/Endpoint.js'

const debug = debugLib('great')

export interface Resources {
  handlers: Record<string, ActionHandler>
  schemas: Map<string, Schema>
  services: Record<string, Service>
  middleware?: Middleware[]
  options: HandlerOptions
}

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args))
  )

const shouldQueue = (action: Action, options: HandlerOptions) =>
  action.meta?.queue === true && !!options.queueService

function getActionHandlerFromType(
  type: string | symbol | undefined,
  handlers: Record<string | symbol, ActionHandler>
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

/**
 * Rename `service` to `targetService` and set id and cid if not already set.
 *
 * Note: We're also removing `meta.authorized`.This is really not needed
 * anymore, as we're using a symbol for marking actions as authorized. We're
 * still keeping it for now for good measures.
 */
function cleanUpActionAndSetIds({
  payload: { service, ...payload },
  meta: { queue, authorized, ...meta } = {},
  ...action
}: Action) {
  const id = meta?.id || nanoid()
  const cid = meta?.cid || id

  return {
    ...action,
    payload: { ...(service && { targetService: service }), ...payload },
    meta: { ...meta, id, cid, dispatchedAt: Date.now() },
  }
}

const cleanUpResponseAndSetAccessAndOrigin = (
  response: Response,
  ident?: Ident
) => ({
  ...response,
  access: { ident, ...response.access },
  ...(response.status !== 'ok'
    ? { origin: response.origin || 'dispatch' }
    : {}),
})

async function mutateIncomingAction(action: Action, getService: GetService) {
  const { sourceService } = action.payload
  if (typeof sourceService !== 'string') {
    return { action }
  }

  const service = getService(undefined, sourceService)
  if (!service) {
    return {
      action: setErrorOnAction(
        action,
        `Source service '${sourceService}' not found`,
        'dispatch',
        'badrequest'
      ),
    }
  }
  const endpoint = await service.endpointFromAction(action, true)
  if (!endpoint) {
    return {
      action: setErrorOnAction(
        action,
        `No matching endpoint for incoming mapping on service '${sourceService}'`,
        'dispatch',
        'badrequest'
      ),
    }
  }
  return {
    action: await service.mutateIncomingRequest(action, endpoint),
    service,
    endpoint,
  }
}

async function mutateIncomingResponse(
  action: Action,
  incomingService?: Service,
  incomingEndpoint?: Endpoint
): Promise<Response> {
  return incomingService && incomingEndpoint
    ? await incomingService.mutateIncomingResponse(action, incomingEndpoint) // Mutate if this is an incoming action
    : action.response || {}
}

async function handleAction(
  handlerType: string | symbol,
  action: Action,
  resources: ActionHandlerResources,
  handlers: Record<string, ActionHandler>
): Promise<Response> {
  // Find handler ...
  const handler = getActionHandlerFromType(handlerType, handlers)
  if (!handler) {
    return createErrorResponse(
      `No handler for ${String(handlerType)} action`,
      'dispatch',
      'badrequest'
    )
  }

  // ... and pass it the action
  return setOrigin(
    await handler(action, resources),
    typeof handlerType === 'string' ? `handler:${handlerType}` : 'handler:queue'
  )
}

/**
 * Setup and return dispatch function. The dispatch function will pass an action
 * through the middleware before sending it to the relevant action handler. When
 * an action has a specified `sourceService`, any action data will be mapped as
 * incoming from that service before the middleware, and will be mapped back to
 * that service in the response.
 */
export default function createDispatch({
  handlers = {},
  schemas = new Map(),
  services = {},
  middleware = [],
  options,
}: Resources): Dispatch {
  // Prepare resources for the dispatch function
  const getService = setupGetService(schemas, services)
  const middlewareFn =
    middleware.length > 0
      ? compose(...middleware)
      : (next: HandlerDispatch) => async (action: Action) => next(action)

  // Create dispatch function
  const dispatch = (rawAction: Action | null) =>
    pProgress(async (setProgress) => {
      debug('Dispatch: %o', rawAction)
      if (!rawAction) {
        return {
          status: 'noaction',
          error: 'Dispatched no action',
          origin: 'dispatch',
        }
      }

      let response
      const {
        action,
        service: incomingService,
        endpoint: incomingEndpoint,
      } = await mutateIncomingAction(
        cleanUpActionAndSetIds(rawAction),
        getService
      )

      if (action.response?.status) {
        response = action.response
      } else {
        const resources = { dispatch, getService, options, setProgress }

        try {
          if (shouldQueue(rawAction, options)) {
            // Use queue handler if queue flag is set and there is a queue
            // service. Bypass middleware
            response = await handleAction(
              QUEUE_SYMBOL,
              action,
              resources,
              handlers
            )
          } else {
            // Send action through middleware before sending to the relevant
            // handler
            const next = async (action: Action) =>
              handleAction(action.type, action, resources, handlers)
            response = setOrigin(
              await middlewareFn(next)(action),
              'middleware:dispatch'
            )
          }
        } catch (err) {
          response = createErrorResponse(
            `Error thrown in dispatch: ${err}`,
            'dispatch'
          )
        }
      }

      return cleanUpResponseAndSetAccessAndOrigin(
        await mutateIncomingResponse(
          setResponseOnAction(rawAction, response),
          incomingService,
          incomingEndpoint
        ),
        action.meta?.ident
      )
    })

  return dispatch
}
