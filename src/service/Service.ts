import debugLib from 'debug'
import pProgress, { ProgressNotifier } from 'p-progress'
import Endpoint from './Endpoint.js'
import {
  setErrorOnAction,
  createErrorResponse,
  setOrigin,
  setOriginOnAction,
} from '../utils/action.js'
import { prepareOptions, mergeOptions } from './utils/options.js'
import Connection from './Connection.js'
import Auth from './Auth.js'
import { lookupById } from '../utils/indexUtils.js'
import { isObject, isNotNullOrUndefined } from '../utils/is.js'
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
  TransporterOptions,
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
  endpoint: Endpoint,
  castFn?: DataMapperEntry
): Action => ({
  ...action,
  payload:
    !endpoint.allowRawRequest && castFn
      ? {
          ...action.payload,
          data: castFn(action.payload.data),
        }
      : action.payload,
  meta: { ...action.meta, options: endpoint.options.transporter || {} },
})

const castResponse = (
  action: Action,
  endpoint: Endpoint,
  castFn?: DataMapperEntry
): Action =>
  !endpoint.allowRawResponse && castFn
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
  #options: TransporterOptions
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
    this.#castFns = castFns

    this.#transporter = lookupById(transporterId, transporters)
    this.#authorization = retrieveAuthorization(authenticators, auths, auth)
    this.#incomingAuth = resolveIncomingAuth(authenticators, auths, auth)
    this.#requireAuth = !!auth

    this.#authorizeDataFromService = authorizeData.fromService(schemas)
    this.#authorizeDataToService = authorizeData.toService(schemas)

    const serviceAdapters = lookupAdapters(adapterDefs, adapters)
    const serviceOptions = prepareOptions(options)
    this.#options = serviceOptions.transporter

    this.#endpoints = Endpoint.sortAndPrepare(endpointDefs).map(
      (endpoint) =>
        new Endpoint(
          endpoint,
          serviceId,
          endpoint.options
            ? mergeOptions(serviceOptions, prepareOptions(endpoint.options))
            : serviceOptions,
          mapOptions,
          mutation,
          [...serviceAdapters, ...lookupAdapters(endpoint.adapters, adapters)]
        )
    )

    this.#middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    this.#connection = this.#transporter
      ? new Connection(this.#transporter, serviceOptions.transporter, emit)
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
   * Mutate request. Will authorize data and mutate action – in that order.
   */
  async mutateRequest(action: Action, endpoint: Endpoint): Promise<Action> {
    const castFn = getCastFn(this.#castFns, action.payload.type)
    const casted = castPayload(action, endpoint, castFn)
    const authorized = this.#authorizeDataToService(
      casted,
      endpoint.allowRawRequest
    )

    let mutated: Action
    try {
      mutated = await endpoint.mutate(authorized, true /* isRev */)
    } catch (error) {
      return setErrorOnAction(
        action,
        `Error while mutating request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'mutate:request'
      )
    }

    return setOriginOnAction(mutated, 'mutate:request', false)
  }

  /**
   * Mutate incoming request. Will mutate action and authorize data – in that
   * order.
   */
  async mutateIncomingRequest(
    action: Action,
    endpoint: Endpoint
  ): Promise<Action> {
    let mutated: Action
    try {
      mutated = await endpoint.mutate(action, false /* isRev */)
    } catch (error) {
      return setErrorOnAction(
        action,
        `Error while mutating incoming request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'mutate:request:incoming'
      )
    }

    const castFn = getCastFn(this.#castFns, action.payload.type)
    const casted = castPayload(mutated, endpoint, castFn)
    const withOrigin = setOriginOnAction(casted, 'mutate:request:incoming')
    return this.#authorizeDataToService(withOrigin, endpoint.allowRawRequest)
  }

  /**
   * Mutate response. Will mutate action and authorize data – in that order.
   */
  async mutateResponse(action: Action, endpoint: Endpoint): Promise<Response> {
    let mutated
    try {
      mutated = await endpoint.mutate(action, false /* isRev */)
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

    const castFn = getCastFn(this.#castFns, action.payload.type)
    const casted = castResponse(mutated, endpoint, castFn)
    const withOrigin = setOriginOnAction(casted, 'mutate:response', false)
    const { response } = this.#authorizeDataFromService(
      withOrigin,
      endpoint.allowRawResponse
    )

    return response || { status: undefined }
  }

  /**
   * Mutate response to incoming request. Will authorize data and mutate action
   * – in that order.
   */
  async mutateIncomingResponse(
    action: Action,
    endpoint: Endpoint
  ): Promise<Response> {
    const castFn = getCastFn(this.#castFns, action.payload.type)
    const casted = castResponse(action, endpoint, castFn)
    const authorized = this.#authorizeDataFromService(
      casted,
      endpoint.allowRawResponse
    )

    let mutated
    try {
      // Authorize and mutate in right order
      mutated = await endpoint.mutate(
        authorized,
        true // isRev
      )
    } catch (error) {
      return {
        ...action.response,
        ...createErrorResponse(
          `Error while mutating response: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'mutate:response:incoming'
        ),
      }
    }

    const { response } = setOriginOnAction(
      mutated,
      'mutate:response:incoming',
      false
    )
    return response || { status: undefined }
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
