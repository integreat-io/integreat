import debugLib from 'debug'
import pProgress, { ProgressNotifier } from 'p-progress'
import createEndpointMappers from './endpoints/index.js'
import {
  setErrorOnAction,
  createErrorResponse,
  setResponseOnAction,
} from '../utils/action.js'
import Connection from './Connection.js'
import Auth from './Auth.js'
import { lookupById } from '../utils/indexUtils.js'
import { isObject } from '../utils/is.js'
import deepClone from '../utils/deepClone.js'
import * as authorizeData from './authorize/data.js'
import authorizeAction from './authorize/action.js'
import { compose } from '../dispatch.js'
import { setUpAuth } from '../create.js'
import type { DataMapperEntry } from 'map-transform/types.js'
import type { Schema } from '../schema/index.js'
import type {
  Action,
  Response,
  Ident,
  Dispatch,
  Middleware,
  Transporter,
  Adapter,
} from '../types.js'
import type {
  Service,
  ServiceDef,
  MapOptions,
  AuthObject,
  AuthProp,
  Authenticator,
  AuthDef,
} from './types.js'

const debug = debugLib('great')

interface Resources {
  transporters?: Record<string, Transporter>
  adapters?: Record<string, Adapter>
  authenticators?: Record<string, Authenticator>
  auths?: Record<string, Auth>
  schemas: Record<string, Schema>
  castFns?: Record<string, DataMapperEntry>
  mapOptions?: MapOptions
  middleware?: Middleware[]
  emit?: (eventType: string, ...args: unknown[]) => void
}

const setServiceIdAsSourceServiceOnAction =
  (serviceId: string): Middleware =>
  (next) =>
  async (action: Action) =>
    next({
      ...action,
      payload: {
        ...action.payload,
        sourceService: action.payload.sourceService || serviceId,
      },
    })

const isIdent = (ident: unknown): ident is Ident => isObject(ident)

async function authorizeIncoming(action: Action, auth?: Auth | boolean) {
  if (auth) {
    if (typeof auth === 'boolean') {
      return action
    }

    try {
      const ident = await auth.authenticateAndGetAuthObject(action, 'asObject')
      if (isIdent(ident)) {
        return { ...action, meta: { ...action.meta, ident } }
      }
    } catch (err) {
      return setErrorOnAction(action, err, 'autherror')
    }
  }

  return { ...action, meta: { ...action.meta, ident: undefined } }
}

const dispatchIncoming = (dispatch: Dispatch, setProgress: ProgressNotifier) =>
  async function (action: Action) {
    if (typeof action.response?.status === 'string') {
      return action
    }

    const p = dispatch(action)
    p.onProgress(setProgress)
    const response = await p
    return { ...action, response }
  }

// TODO: Consider if there is an easier way to pass the `setProgress` method
// through to the caller, i.e. to preserve the PProgress
const dispatchIncomingWithMiddleware =
  (dispatch: Dispatch, middleware: Middleware, auth?: Auth | boolean) =>
  (action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      if (action) {
        const { response } = await middleware(
          dispatchIncoming(dispatch, setProgress)
        )(await authorizeIncoming(action, auth))

        return response || { status: 'error' }
      } else {
        return { status: 'noaction', error: 'No action was dispatched' }
      }
    })

const isTransporter = (transporter: unknown): transporter is Transporter =>
  isObject(transporter)

const sendToTransporter = (
  transporter: Transporter,
  connection: Connection,
  serviceId: string
) =>
  async function send(action: Action) {
    try {
      if (await connection.connect(action.meta?.auth)) {
        const response = await transporter.send(action, connection.object)
        return setResponseOnAction(action, response)
      } else {
        return setErrorOnAction(
          action,
          `Could not connect to service '${serviceId}'. [${
            connection.status
          }] ${connection.error || ''}`.trim()
        )
      }
    } catch (error) {
      return setErrorOnAction(
        action,
        `Error retrieving from service '${serviceId}': ${
          (error as Error).message
        }`
      )
    }
  }

const isAuthDef = (def: unknown): def is AuthDef =>
  isObject(def) &&
  typeof def.id === 'string' &&
  typeof def.authenticator === 'string'

function retrieveAuthorization(
  authenticators: Record<string, Authenticator>,
  auths?: Record<string, Auth>,
  auth?: AuthObject | AuthProp
): Auth | undefined {
  if (isObject(auth) && !!auth.outgoing) {
    auth = auth.outgoing
  }

  if (typeof auth === 'string') {
    return lookupById(auth, auths)
  } else if (isAuthDef(auth)) {
    return setUpAuth(authenticators)(auth)
  } else {
    return undefined
  }
}

function resolveIncomingAuth(
  authenticators: Record<string, Authenticator>,
  auths?: Record<string, Auth>,
  auth?: AuthObject | AuthProp
) {
  if (isObject(auth) && auth.incoming) {
    return auth.incoming === true
      ? true
      : retrieveAuthorization(authenticators, auths, auth.incoming)
  } else {
    return auth === true ? true : undefined
  }
}

const getCastFn = (castFns: Record<string, DataMapperEntry>, action: Action) =>
  typeof action.payload.type === 'string'
    ? castFns[action.payload.type]
    : undefined

const castByType = (castFns: Record<string, DataMapperEntry>) =>
  function castAction(action: Action, allowRaw: boolean, isRequest = false) {
    if (!allowRaw) {
      const castFn = getCastFn(castFns, action)
      if (castFn) {
        if (isRequest && action.payload) {
          return {
            ...action,
            payload: {
              ...action.payload,
              data: castFn(action.payload.data),
            },
          }
        } else if (!isRequest && action.response) {
          return {
            ...action,
            response: {
              ...action.response,
              data: castFn(action.response.data),
            },
          }
        }
      }
    }
    return action
  }

/**
 * Create a service with the given id and transporter.
 */
export default ({
    transporters,
    // adapters = {},
    authenticators = {},
    auths,
    schemas,
    castFns = {},
    mapOptions = {},
    middleware = [],
    emit = () => undefined, // Provide a fallback for tests
  }: Resources) =>
  ({
    id: serviceId,
    transporter: transporterId,
    auth,
    meta,
    options = {},
    mutation,
    endpoints: endpointDefs = [],
  }: ServiceDef): Service => {
    if (typeof serviceId !== 'string' || serviceId === '') {
      throw new TypeError(`Can't create service without an id.`)
    }

    const transporter = lookupById(transporterId, transporters)

    const authorization = retrieveAuthorization(authenticators, auths, auth)
    const incomingAuth = resolveIncomingAuth(authenticators, auths, auth)
    const requireAuth = !!auth

    const authorizeDataFromService = authorizeData.fromService(schemas)
    const authorizeDataToService = authorizeData.toService(schemas)

    const getEndpointMapper = createEndpointMappers(
      serviceId,
      endpointDefs,
      options,
      mapOptions,
      mutation,
      isTransporter(transporter) ? transporter.prepareOptions : undefined
    )

    const castAction = castByType(castFns)

    const runThroughMiddleware: Middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    let connection = isTransporter(transporter)
      ? new Connection(transporter, options, emit)
      : null

    // Create the service instance
    return {
      id: serviceId,
      meta,

      /**
       * Return the endpoint mapper that best matches the given action.
       */
      endpointFromAction: getEndpointMapper,

      /**
       * Authorize the action. Sets the authorized flag if okay, otherwise sets
       * an appropriate status and error.
       */
      authorizeAction: authorizeAction(schemas, requireAuth),

      /**
       * Map request. Will authorize data and map action – in that order – when
       * this is an outgoing request, and will do it in reverse for an incoming
       * request.
       */
      async mapRequest(action, endpoint, isIncoming = false) {
        const { mutateRequest, allowRawRequest = false } = endpoint

        // Set endpoint options on action
        const nextAction = {
          ...action,
          meta: { ...action.meta, options: deepClone(endpoint.options) },
        }

        try {
          // Authorize and map in right order
          return isIncoming
            ? authorizeDataToService(
                castAction(
                  mutateRequest(nextAction, isIncoming),
                  allowRawRequest,
                  true // isRequest
                ),
                allowRawRequest
              )
            : mutateRequest(
                authorizeDataToService(
                  castAction(
                    nextAction,
                    allowRawRequest,
                    true // isRequest
                  ),
                  allowRawRequest
                ),
                isIncoming
              )
        } catch (error) {
          return setErrorOnAction(
            action,
            `Error while mutating request: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      },

      /**
       * Map response. Will map action and authorize data – in the order – when
       * this is the response from an outgoing request. Will do it in the reverse
       * order for a response to an incoming request.
       */
      async mapResponse(action, endpoint, isIncoming = false) {
        const { mutateResponse, allowRawResponse = false } = endpoint
        try {
          // Authorize and mutate in right order
          return isIncoming
            ? mutateResponse(
                authorizeDataFromService(
                  castAction(action, allowRawResponse),
                  allowRawResponse
                ),
                isIncoming
              )
            : authorizeDataFromService(
                castAction(
                  mutateResponse(action, isIncoming),
                  allowRawResponse
                ),
                allowRawResponse
              )
        } catch (error) {
          return setErrorOnAction(
            action,
            `Error while mutating response: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      },

      /**
       * The given action is sent to the service via the relevant transporter,
       * and the action is updated with the response from the service.
       */
      async send(action) {
        if (action.response?.status) {
          return action
        }

        if (!isTransporter(transporter)) {
          return setErrorOnAction(
            action,
            `Service '${serviceId}' has no transporter`
          )
        }
        if (!connection) {
          return setErrorOnAction(
            action,
            `Service '${serviceId}' has no connection`
          )
        }

        if (!action.meta?.authorized) {
          return setErrorOnAction(action, 'Not authorized')
        }

        // When an authenticator is set: Authenticate and apply result to action
        if (authorization) {
          await authorization.authenticate(action)
          action = authorization.applyToAction(action, transporter)
          if (action.response?.status) {
            return action
          }
        }

        return runThroughMiddleware(
          sendToTransporter(transporter, connection, serviceId)
        )(action)
      },

      /**
       * Will start to listen on the transporter when relevant, i.e. when the
       * transporter has `listen()` method. Incoming requests will be dispatched
       * as actions to the provided `dispatch()` function.
       */
      async listen(dispatch) {
        debug('Set up service listening ...')
        if (!isTransporter(transporter)) {
          debug(`Service '${serviceId}' has no transporter`)
          return createErrorResponse(
            `Service '${serviceId}' has no transporter`
          )
        }
        if (!connection) {
          debug(`Service '${serviceId}' has no connection`)
          return createErrorResponse(`Service '${serviceId}' has no connection`)
        }

        if (typeof transporter.listen !== 'function') {
          debug('Transporter has no listen method')
          return createErrorResponse(
            'Transporter has no listen method',
            'noaction'
          )
        }

        if (
          typeof transporter.shouldListen === 'function' &&
          !transporter.shouldListen(options)
        ) {
          debug('Transporter is not configured to listen')
          return createErrorResponse(
            'Transporter is not configured to listen',
            'noaction'
          )
        }

        if (authorization && !(await authorization.authenticate(null))) {
          debug('Could not authenticate')
          return authorization.getStatusObject()
        }

        if (
          !(await connection.connect(authorization?.getAuthObject(transporter)))
        ) {
          debug(`Could not listen to '${serviceId}' service. Failed to connect`)
          return createErrorResponse(
            `Could not listen to '${serviceId}' service. Failed to connect`
          )
        }

        const incomingMiddleware = compose(
          runThroughMiddleware,
          setServiceIdAsSourceServiceOnAction(serviceId)
        )

        debug('Calling transporter listen() ...')
        return transporter.listen(
          dispatchIncomingWithMiddleware(
            dispatch,
            incomingMiddleware,
            incomingAuth
          ),
          connection.object
        )
      },

      /**
       * Will disconnect the transporter
       */
      async close() {
        debug(`Close service '${serviceId}'`)
        if (!isTransporter(transporter) || !connection) {
          debug('No transporter to disconnect')
          return createErrorResponse('No transporter to disconnect', 'noaction')
        }

        await transporter.disconnect(connection.object)
        connection = null
        debug(`Closed`)
        return { status: 'ok' }
      },
    }
  }
