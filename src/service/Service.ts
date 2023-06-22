import debugLib from 'debug'
import pProgress, { ProgressNotifier } from 'p-progress'
import Endpoint from './Endpoint.js'
import {
  setErrorOnAction,
  createErrorResponse,
  setOrigin,
  setOriginOnAction,
} from '../utils/action.js'
import Connection from './Connection.js'
import Auth from './Auth.js'
import { lookupById } from '../utils/indexUtils.js'
import { isObject, isNotNullOrUndefined } from '../utils/is.js'
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

async function authorizeIncoming(
  action: Action,
  serviceId: string,
  auth?: Auth | boolean
) {
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
      return setErrorOnAction(action, err, `service:${serviceId}`, 'autherror')
    }
  }

  return { ...action, meta: { ...action.meta, ident: undefined } }
}

const dispatchIncoming = (
  dispatch: Dispatch,
  setProgress: ProgressNotifier,
  serviceId: string
) =>
  async function (action: Action): Promise<Response> {
    if (typeof action.response?.status === 'string') {
      return action.response
    }

    const p = dispatch(action)
    p.onProgress(setProgress)
    return setOrigin(await p, `service:${serviceId}`)
  }

// TODO: Consider if there is an easier way to pass the `setProgress` method
// through to the caller, i.e. to preserve the PProgress
const dispatchIncomingWithMiddleware =
  (
    dispatch: Dispatch,
    middleware: Middleware,
    serviceId: string,
    auth?: Auth | boolean
  ) =>
  (action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      if (action) {
        const response = await middleware(
          dispatchIncoming(dispatch, setProgress, serviceId)
        )(await authorizeIncoming(action, serviceId, auth))

        return (
          setOrigin(response, `middleware:service:${serviceId}`) || {
            status: 'error',
            origin: `service:${serviceId}`,
          }
        )
      } else {
        return {
          status: 'noaction',
          error: 'No action was dispatched',
          origin: `service:${serviceId}`,
        }
      }
    })

const sendToTransporter = (
  transporter: Transporter,
  connection: Connection,
  serviceId: string
) =>
  async function send(action: Action): Promise<Response> {
    try {
      if (await connection.connect(action.meta?.auth)) {
        return setOrigin(
          await transporter.send(action, connection.object),
          `service:${serviceId}`,
          true
        )
      } else {
        return createErrorResponse(
          `Could not connect to service '${serviceId}'. [${
            connection.status
          }] ${connection.error || ''}`.trim(),
          `service:${serviceId}`
        )
      }
    } catch (error) {
      return createErrorResponse(
        `Error retrieving from service '${serviceId}': ${
          (error as Error).message
        }`,
        `service:${serviceId}`
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

const getCastFn = (
  castFns: Record<string, DataMapperEntry>,
  type?: string | string[]
) =>
  typeof type === 'string'
    ? castFns[type] // eslint-disable-line security/detect-object-injection
    : undefined

const castPayload = (
  action: Action,
  castFn?: DataMapperEntry,
  allowRaw = false
): Action =>
  !allowRaw && castFn
    ? {
        ...action,
        payload: {
          ...action.payload,
          data: castFn(action.payload.data),
        },
      }
    : action

const castResponse = (
  action: Action,
  castFn?: DataMapperEntry,
  allowRaw = false
): Action =>
  !allowRaw && castFn
    ? {
        ...action,
        response: {
          ...action.response,
          data: castFn(action.response?.data),
        },
      }
    : action

const lookupAdapters = (
  defs: (string | Adapter)[] = [],
  adapters: Record<string, Adapter>
) =>
  defs
    .map((adapterId) => lookupById(adapterId, adapters))
    .filter(isNotNullOrUndefined)

/**
 * Create a service with the given id and transporter.
 */
export default class Service {
  id: string
  meta?: string

  #schemas: Record<string, Schema>
  #options: Record<string, unknown>
  #endpoints: Endpoint[]
  #transporter?: Transporter
  #castFns: Record<string, DataMapperEntry>

  #authorization?: Auth
  #incomingAuth?: Auth | true
  #requireAuth: boolean
  #connection: Connection | null

  #authorizeDataFromService
  #authorizeDataToService
  #middleware: Middleware

  constructor(
    {
      id: serviceId,
      transporter: transporterId,
      adapters: adapterDefs = [],
      auth,
      meta,
      options = {},
      mutation,
      endpoints: endpointDefs = [],
    }: ServiceDef,
    {
      transporters,
      adapters = {},
      authenticators = {},
      auths,
      schemas,
      castFns = {},
      mapOptions = {},
      middleware = [],
      emit = () => undefined, // Provide a fallback for tests
    }: Resources
  ) {
    if (typeof serviceId !== 'string' || serviceId === '') {
      throw new TypeError(`Can't create service without an id.`)
    }

    this.id = serviceId
    this.meta = meta

    this.#schemas = schemas
    this.#options = options
    this.#castFns = castFns

    this.#transporter = lookupById(transporterId, transporters)
    this.#authorization = retrieveAuthorization(authenticators, auths, auth)
    this.#incomingAuth = resolveIncomingAuth(authenticators, auths, auth)
    this.#requireAuth = !!auth

    this.#authorizeDataFromService = authorizeData.fromService(schemas)
    this.#authorizeDataToService = authorizeData.toService(schemas)

    const serviceAdapters = lookupAdapters(adapterDefs, adapters)
    this.#endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
      (endpoint) =>
        new Endpoint(
          {
            ...endpoint,
            adapters: lookupAdapters(endpoint.adapters, adapters),
          },
          serviceId,
          options,
          mapOptions,
          mutation,
          this.#transporter?.prepareOptions,
          serviceAdapters
        )
    )

    this.#middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    this.#connection = this.#transporter
      ? new Connection(this.#transporter, options, emit)
      : null
  }

  /**
   * Return the endpoint mapper that best matches the given action.
   */
  endpointFromAction(action: Action, isIncoming = false): Endpoint | undefined {
    return Endpoint.findMatchingEndpoint(this.#endpoints, action, isIncoming)
  }

  /**
   * Authorize the action. Sets the authorized flag if okay, otherwise sets
   * an appropriate status and error.
   */
  authorizeAction(action: Action): Action {
    return authorizeAction(this.#schemas, this.#requireAuth)(action)
  }

  /**
   * Map request. Will authorize data and mutate action – in that order –
   * when this is an outgoing request, and will do it in reverse for an
   * incoming request.
   */
  async mutateRequest(
    action: Action,
    endpoint: Endpoint,
    isIncoming = false
  ): Promise<Action> {
    // Set endpoint options on action
    const nextAction = {
      ...action,
      meta: { ...action.meta, options: deepClone(endpoint.options) },
    }
    const castFn = getCastFn(this.#castFns, action.payload.type)

    try {
      // Authorize and mutate in right order
      return setOriginOnAction(
        isIncoming
          ? this.#authorizeDataToService(
              castPayload(
                await endpoint.mutate(nextAction, false /* isRev */),
                castFn,
                endpoint.allowRawRequest
              ),
              endpoint.allowRawRequest
            )
          : await endpoint.mutate(
              this.#authorizeDataToService(
                castPayload(nextAction, castFn, endpoint.allowRawRequest),
                endpoint.allowRawRequest
              ),
              true // isRev
            ),
        'mutate:request',
        false
      )
    } catch (error) {
      return setErrorOnAction(
        action,
        `Error while mutating request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'mutate:request'
      )
    }
  }

  /**
   * Map response. Will mutate action and authorize data – in that order –
   * when this is the response from an outgoing request. Will do it in the
   * reverse order for a response to an incoming request.
   */
  async mutateResponse(
    action: Action,
    endpoint: Endpoint,
    isIncoming = false
  ): Promise<Response> {
    const castFn = getCastFn(this.#castFns, action.payload.type)

    try {
      // Authorize and mutate in right order
      const mutated = isIncoming
        ? setOriginOnAction(
            await endpoint.mutate(
              this.#authorizeDataFromService(
                castResponse(action, castFn, endpoint.allowRawResponse),
                endpoint.allowRawResponse
              ),
              true // isRev
            ),
            'mutate:response',
            false
          )
        : this.#authorizeDataFromService(
            setOriginOnAction(
              castResponse(
                await endpoint.mutate(action, false /* isRev */),
                castFn,
                endpoint.allowRawResponse
              ),
              'mutate:response',
              false
            ),
            endpoint.allowRawResponse
          )
      return mutated.response || { status: undefined }
    } catch (error) {
      return {
        ...action.response,
        ...createErrorResponse(
          `Error while mutating response: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'mutate:response'
        ),
      }
    }
  }

  /**
   * The given action is sent to the service via the relevant transporter,
   * and the response from the service is returned.
   */
  async send(action: Action): Promise<Response> {
    // Do nothing if the action response already has a status
    if (action.response?.status) {
      return action.response
    }

    // Fail if we have no transporter or connection. The second is because
    // of the first, so it's really the same error.
    if (!this.#transporter || !this.#connection) {
      return createErrorResponse(
        `Service '${this.id}' has no transporter`,
        `internal:service:${this.id}`
      )
    }

    if (!action.meta?.authorized) {
      return createErrorResponse(
        'Not authorized',
        `internal:service:${this.id}`,
        'autherror'
      )
    }

    // When an authenticator is set: Authenticate and apply result to action
    if (this.#authorization) {
      await this.#authorization.authenticate(action)
      action = this.#authorization.applyToAction(action, this.#transporter)
      if (action.response?.status) {
        return setOrigin(action.response, `service:${this.id}`, true)
      }
    }

    return setOrigin(
      await this.#middleware(
        sendToTransporter(this.#transporter, this.#connection, this.id)
      )(action),
      `middleware:service:${this.id}`
    )
  }

  /**
   * Will start to listen on the transporter when relevant, i.e. when the
   * transporter has `listen()` method. Incoming requests will be dispatched
   * as actions to the provided `dispatch()` function.
   */
  async listen(dispatch: Dispatch): Promise<Response> {
    debug('Set up service listening ...')

    if (!this.#transporter) {
      debug(`Service '${this.id}' has no transporter`)
      return createErrorResponse(
        `Service '${this.id}' has no transporter`,
        `internal:service:${this.id}`
      )
    }
    if (!this.#connection) {
      debug(`Service '${this.id}' has no open connection`)
      return createErrorResponse(
        `Service '${this.id}' has no open connection`,
        `service:${this.id}`
      )
    }

    if (typeof this.#transporter.listen !== 'function') {
      debug('Transporter has no listen method')
      return createErrorResponse(
        'Transporter has no listen method',
        `service:${this.id}`,
        'noaction'
      )
    }

    if (
      typeof this.#transporter.shouldListen === 'function' &&
      !this.#transporter.shouldListen(this.#options)
    ) {
      debug('Transporter is not configured to listen')
      return createErrorResponse(
        'Transporter is not configured to listen',
        `service:${this.id}`,
        'noaction'
      )
    }

    if (
      this.#authorization &&
      !(await this.#authorization.authenticate(null))
    ) {
      debug('Could not authenticate')
      return setOrigin(
        this.#authorization.getStatusObject(),
        `service:${this.id}`,
        true
      )
    }

    if (
      !(await this.#connection.connect(
        this.#authorization?.getAuthObject(this.#transporter)
      ))
    ) {
      debug(`Could not listen to '${this.id}' service. Failed to connect`)
      return createErrorResponse(
        `Could not listen to '${this.id}' service. Failed to connect`,
        `service:${this.id}`
      )
    }

    const incomingMiddleware = compose(
      this.#middleware,
      setServiceIdAsSourceServiceOnAction(this.id)
    )

    debug('Calling transporter listen() ...')
    return this.#transporter.listen(
      dispatchIncomingWithMiddleware(
        dispatch,
        incomingMiddleware,
        this.id,
        this.#incomingAuth
      ),
      this.#connection.object
    )
  }

  /**
   * Will disconnect the transporter
   */
  async close(): Promise<Response> {
    debug(`Close service '${this.id}'`)
    if (!this.#transporter || !this.#connection) {
      debug('No transporter to disconnect')
      return createErrorResponse(
        'No transporter to disconnect',
        `internal:service:${this.id}`,
        'noaction'
      )
    }

    await this.#transporter.disconnect(this.#connection.object)
    this.#connection = null
    debug(`Closed`)
    return { status: 'ok' }
  }
}
