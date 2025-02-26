import pProgress from 'p-progress'
import debugLib from 'debug'
import { QUEUE_SYMBOL } from './handlers/index.js'
import setupGetService from './utils/getService.js'
import {
  setErrorOnAction,
  setResponseOnAction,
  setOptionsOnAction,
  setActionIds,
} from './utils/action.js'
import { createErrorResponse, setOrigin } from './utils/response.js'
import { completeIdentOnAction } from './utils/completeIdent.js'
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
  EmitFn,
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
  emit: EmitFn
}

export const compose = (...fns: Middleware[]): Middleware =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        f(g(...args)),
  )

const shouldCompleteIdent = (action: Action, options: HandlerOptions) =>
  options.identConfig?.completeIdent && action.type !== 'GET_IDENT'

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
 * We're also removing `meta.auth`
 */
function cleanUpActionAndSetIds({
  payload: { service, ...payload },
  meta: { auth, ...meta } = {},
  ...action
}: Action): Action {
  return setActionIds({
    ...action,
    payload: { ...(service && { targetService: service }), ...payload },
    meta: { ...meta, dispatchedAt: Date.now() },
  })
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

function prepareActionForQueue(
  action: Action,
  options: HandlerOptions,
): [Action, boolean] {
  if (action.meta?.queue) {
    if (options.queueService) {
      return [action, true]
    } else {
      return [removeQueueFlag(action), false]
    }
  } else {
    return [action, false]
  }
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
  emit,
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

      // Clean up action and set id
      let cleanedUpAction = cleanUpActionAndSetIds(originalAction)
      const actionId = cleanedUpAction.meta?.id as string // This is a string
      actionIds.add(actionId) // Add action id to list of running actions

      if (shouldCompleteIdent(cleanedUpAction, options)) {
        cleanedUpAction = await completeIdentOnAction(cleanedUpAction, dispatch) // Complete ident on action if configured to
      }

      const {
        action,
        service: incomingService,
        endpoint: incomingEndpoint,
      } = await mutateIncomingAction(cleanedUpAction, getService)

      let response
      if (action.response?.status) {
        // Stop here if the mutation set a response
        response = action.response
      } else {
        try {
          // We'll queue if there is a queue service and the action has the
          // queue flag. If we're not queueing, any queue flag will be removed
          // from the action
          const [nextAction, doQueue] = prepareActionForQueue(action, options)

          // Prepare a next function that will pass the action on to the
          // relevant handler.
          const next = async (action: Action) =>
            handleAction(
              doQueue ? QUEUE_SYMBOL : action.type,
              action,
              { dispatch, getService, options, setProgress },
              handlers,
            )
          // Pass the action through the middleware, before invoking the next
          // function.
          response = setOrigin(
            await middlewareFn(next)(nextAction),
            'middleware:dispatch',
          )
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
      if (actionIds.size === 0) {
        // Emit 'done' event when we have cleared the list of running actions
        emit('done')
      }
      return cleanedUpResponse
    })

  return dispatch
}
