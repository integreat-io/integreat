import { nanoid } from 'nanoid'
import pProgress from 'p-progress'
import debugLib from 'debug'
import { QUEUE_SYMBOL } from './handlers/index.js'
import setupGetService from './utils/getService.js'
import {
  setErrorOnAction,
  setResponseOnAction,
  setOptionsOnAction,
} from './utils/action.js'
import { createErrorResponse, setOrigin } from './utils/response.js'
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
  actionIds: Set<string>
}

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args)),
  )

// Uses `queue` flag from mutated action if it is set, otherwise uses falls
// back to `queue` flag from original action. Also requires that a queue service
// is configured.
const shouldQueue = (mutatedAction: Action, options: HandlerOptions) =>
  !!options.queueService && mutatedAction.meta?.queue

function getActionHandlerFromType(
  type: string | symbol | undefined,
  handlers: Record<string | symbol, ActionHandler>,
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
function cleanUpActionAndSetIds(
  {
    payload: { service, ...payload },
    meta: { auth, ...meta } = {},
    ...action
  }: Action,
  id: string,
) {
  const cid = meta?.cid || id

  return {
    ...action,
    payload: { ...(service && { targetService: service }), ...payload },
    meta: { ...meta, id, cid, dispatchedAt: Date.now() },
  }
}

const cleanUpResponseAndSetAccessAndOrigin = (
  response: Response,
  ident?: Ident,
) => ({
  ...response,
  access: { ident, ...response.access },
  ...(response.status !== 'ok'
    ? { origin: response.origin || 'dispatch' }
    : {}),
})

const removeQueueFlag = ({
  meta: { queue, ...meta } = {},
  ...action
}: Action) => ({ ...action, meta })

const adjustActionAfterIncomingMutation = (
  { payload: { sourceService, ...payload } = {}, ...action }: Action,
  originalAction: Action,
) => ({
  ...action,
  payload,
  meta: {
    ...action.meta,
    queue: action.meta?.queue ?? originalAction.meta?.queue,
  },
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
        'badrequest',
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
        'badrequest',
      ),
    }
  }

  let mutatedAction
  const validateResponse = await endpoint.validateAction(action)
  if (validateResponse) {
    mutatedAction = setResponseOnAction(action, validateResponse)
  } else {
    mutatedAction = adjustActionAfterIncomingMutation(
      await service.mutateIncomingRequest(
        setOptionsOnAction(action, endpoint),
        endpoint,
      ),
      action,
    )
  }
  return { action: mutatedAction, service, endpoint }
}

async function mutateIncomingResponse(
  action: Action,
  service?: Service,
  endpoint?: Endpoint,
): Promise<Response> {
  return service && endpoint
    ? await service.mutateIncomingResponse(
        setOptionsOnAction(action, endpoint),
        endpoint,
      ) // Mutate if this is an incoming action
    : action.response || {}
}

async function handleAction(
  handlerType: string | symbol,
  action: Action,
  resources: ActionHandlerResources,
  handlers: Record<string, ActionHandler>,
): Promise<Response> {
  // Find handler ...
  const handler = getActionHandlerFromType(handlerType, handlers)
  if (!handler) {
    return createErrorResponse(
      `No handler for ${String(handlerType)} action`,
      'dispatch',
      'badrequest',
    )
  }

  // ... and pass it the action
  return setOrigin(
    await handler(action, resources),
    typeof handlerType === 'string'
      ? `handler:${handlerType}`
      : 'handler:queue',
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
  actionIds,
}: Resources): Dispatch {
  // Prepare resources for the dispatch function
  const getService = setupGetService(schemas, services)
  const middlewareFn =
    middleware.length > 0
      ? compose(...middleware)
      : (next: HandlerDispatch) => async (action: Action) => next(action)

  // Create dispatch function
  const dispatch = (originalAction: Action | null) =>
    pProgress(async (setProgress) => {
      debug('Dispatch: %o', originalAction)
      if (!originalAction) {
        return {
          status: 'noaction',
          error: 'Dispatched no action',
          origin: 'dispatch',
        }
      }
      const actionId = originalAction.meta?.id ?? nanoid() // Get id from action or generate an id
      actionIds.add(actionId) // Add action id to list of running actions

      let response
      const {
        action,
        service: incomingService,
        endpoint: incomingEndpoint,
      } = await mutateIncomingAction(
        cleanUpActionAndSetIds(originalAction, actionId),
        getService,
      )

      if (action.response?.status) {
        // Stop here if the mutation set a response
        response = action.response
      } else {
        const resources = { dispatch, getService, options, setProgress }

        try {
          if (shouldQueue(action, options)) {
            // Use queue handler if queue flag is set and there is a queue
            // service. Bypass middleware
            response = await handleAction(
              QUEUE_SYMBOL,
              action,
              resources,
              handlers,
            )
          } else {
            // Send action through middleware before sending to the relevant
            // handler
            const next = async (action: Action) =>
              handleAction(action.type, action, resources, handlers)
            response = setOrigin(
              await middlewareFn(next)(removeQueueFlag(action)),
              'middleware:dispatch',
            )
          }
        } catch (err) {
          response = createErrorResponse(
            `Error thrown in dispatch: ${
              err instanceof Error ? err.message : String(err)
            }`,
            'dispatch',
          )
        }
      }

      const cleanedUpResponse = cleanUpResponseAndSetAccessAndOrigin(
        await mutateIncomingResponse(
          setResponseOnAction(action, response),
          incomingService,
          incomingEndpoint,
        ),
        action.meta?.ident,
      )
      actionIds.delete(actionId) // Remove action id from list of running actions
      return cleanedUpResponse
    })

  return dispatch
}
