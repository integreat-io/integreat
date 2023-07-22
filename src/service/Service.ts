import debugLib from 'debug'
import Endpoint from './Endpoint.js'
import { sendToTransporter } from './utils/send.js'
import { dispatchIncoming, authenticateCallback } from './utils/incoming.js'
import { resolveAuth, resolveIncomingAuth } from './utils/resolveAuth.js'
import { castPayload, castResponse, getCastFn } from './utils/cast.js'
import {
  setErrorOnAction,
  createErrorResponse,
  setOrigin,
  setOriginOnAction,
} from '../utils/action.js'
import { prepareOptions, mergeOptions } from './utils/options.js'
import Connection from './Connection.js'
import Auth from './Auth.js'
import { lookupById, lookupByIds } from '../utils/indexUtils.js'
import * as authorizeData from './utils/authData.js'
import authorizeAction, { isAuthorizedAction } from './utils/authAction.js'
import { compose } from '../dispatch.js'
import type { DataMapperEntry } from 'map-transform/types.js'
import type { Schema } from '../schema/index.js'
import type {
  Action,
  Response,
  Dispatch,
  Middleware,
  Transporter,
  Adapter,
  Authenticator,
} from '../types.js'
import type { ServiceDef, MapOptions, TransporterOptions } from './types.js'

const debug = debugLib('great')

export interface Resources {
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

  #auth?: Auth
  #incomingAuth?: Auth
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
    this.#auth = resolveAuth(authenticators, auths, auth)
    this.#incomingAuth = resolveIncomingAuth(authenticators, auths, auth)

    this.#authorizeDataFromService = authorizeData.fromService(schemas)
    this.#authorizeDataToService = authorizeData.toService(schemas)

    const serviceAdapters = lookupByIds(adapterDefs, adapters)
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
          [...serviceAdapters, ...lookupByIds(endpoint.adapters, adapters)]
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
    return authorizeAction(this.#schemas, !!this.#auth)(action)
  }

  /**
   * Mutate request. Will authorize data and mutate action – in that order.
   */
  async mutateRequest(action: Action, endpoint: Endpoint): Promise<Action> {
    const castFn = getCastFn(this.#castFns, action.payload.type)
    const castedAction = castPayload(action, endpoint, castFn)
    const authorizedAction = this.#authorizeDataToService(
      castedAction,
      endpoint.allowRawRequest
    )

    let mutatedAction: Action
    try {
      mutatedAction = await endpoint.mutate(authorizedAction, true /* isRev */)
    } catch (error) {
      return setErrorOnAction(
        action,
        `Error while mutating request: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'mutate:request'
      )
    }

    return setOriginOnAction(mutatedAction, 'mutate:request', false)
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
    const castedAction = castResponse(action, endpoint, castFn)
    const authorizedAction = this.#authorizeDataFromService(
      castedAction,
      endpoint.allowRawResponse
    )

    let mutatedAction: Action
    try {
      // Authorize and mutate in right order
      mutatedAction = await endpoint.mutate(
        authorizedAction,
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
      mutatedAction,
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

    if (!isAuthorizedAction(action)) {
      return createErrorResponse(
        'Not authorized',
        `internal:service:${this.id}`,
        'autherror'
      )
    }

    // When an authenticator is set: Authenticate and apply result to action
    if (this.#auth) {
      await this.#auth.authenticate(action)
      action = this.#auth.applyToAction(action, this.#transporter)
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

    if (this.#auth && !(await this.#auth.authenticate(null))) {
      debug('Could not authenticate')
      return setOrigin(
        this.#auth.getResponseFromAuth(),
        `service:${this.id}`,
        true
      )
    }

    if (
      !(await this.#connection.connect(
        this.#auth?.getAuthObject(this.#transporter)
      ))
    ) {
      debug(`Could not listen to '${this.id}' service. Failed to connect`)
      return createErrorResponse(
        `Could not listen to '${this.id}' service. Failed to connect`,
        `service:${this.id}`
      )
    }

    debug('Calling transporter listen() ...')
    return this.#transporter.listen(
      dispatchIncoming(dispatch, this.#middleware, this.id),
      this.#connection.object,
      authenticateCallback(this.#incomingAuth, this.id)
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
