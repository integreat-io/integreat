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
  setOptionsOnAction,
  setResponseOnAction,
} from '../utils/action.js'
import { prepareOptions, mergeOptions } from './utils/options.js'
import Connection from './Connection.js'
import { lookupById, lookupByIds } from '../utils/indexUtils.js'
import * as authorizeData from './utils/authData.js'
import authorizeAction, { isAuthorizedAction } from './utils/authAction.js'
import { compose } from '../dispatch.js'
import type Schema from '../schema/Schema.js'
import type Auth from './Auth.js'
import type {
  Action,
  Response,
  Dispatch,
  Middleware,
  Transporter,
  Adapter,
  Authenticator,
  MapOptions,
} from '../types.js'
import type { ServiceDef, TransporterOptions } from './types.js'

const debug = debugLib('great')

export interface Resources {
  transporters?: Record<string, Transporter>
  adapters?: Record<string, Adapter>
  authenticators?: Record<string, Authenticator>
  auths?: Record<string, Auth>
  schemas: Map<string, Schema>
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

  #schemas: Map<string, Schema>
  #options: TransporterOptions
  #endpoints: Endpoint[]
  #transporter: Transporter

  #auth?: Auth
  #incomingAuth?: Auth[]
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

    const transporter = lookupById(transporterId, transporters)
    if (!transporter) {
      throw new TypeError(
        `Service '${serviceId}' references unknown transporter '${transporterId}'`
      )
    }
    this.#transporter = transporter

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
          serviceAdapters,
          lookupByIds(endpoint.adapters, adapters)
        )
    )

    this.#middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    this.#connection = new Connection(
      this.#transporter,
      serviceOptions.transporter,
      emit
    )
  }

  /**
   * Return the endpoint mapper that best matches the given action.
   */
  async endpointFromAction(
    action: Action,
    isIncoming = false
  ): Promise<Endpoint | undefined> {
    return await Endpoint.findMatchingEndpoint(
      this.#endpoints,
      action,
      isIncoming
    )
  }

  /**
   * Authorize and validate the action. This is required before sending it to
   * the service, and should be done before mutation. The `auth` object will be
   * set on the action here, for services that are configured to include make
   * auth available to mutations.
   *
   * Note that the returned action may include a response, which should be
   * returned instead of the action being sent to the service. The response
   * should be run through the response mutation, though.
   */
  async preflightAction(action: Action, endpoint: Endpoint): Promise<Action> {
    const authorized = authorizeAction(this.#schemas, !!this.#auth)(action)
    if (authorized.response?.status) {
      return authorized
    }

    const validateResponse = await endpoint.validateAction(authorized)
    if (validateResponse) {
      return setResponseOnAction(authorized, validateResponse)
    }
    return authorized
  }

  /**
   * Mutate request. Will authorize data and mutate action – in that order.
   */
  async mutateRequest(action: Action, endpoint: Endpoint): Promise<Action> {
    const castFn = getCastFn(this.#schemas, action.payload.type)
    const actionWithOptions = setOptionsOnAction(action, endpoint)
    const castedAction = castPayload(actionWithOptions, endpoint, castFn)
    const authorizedAction = await this.#authorizeDataToService(
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

    const castFn = getCastFn(this.#schemas, mutated.payload.type)
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

    const castFn = getCastFn(this.#schemas, mutated.payload.type)
    const casted = castResponse(mutated, endpoint, castFn)
    const withOrigin = setOriginOnAction(casted, 'mutate:response', false)
    const { response } = await this.#authorizeDataFromService(
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
    const castFn = getCastFn(this.#schemas, action.payload.type)
    const castedAction = castResponse(action, endpoint, castFn)
    const authorizedAction = await this.#authorizeDataFromService(
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

    if (!this.#connection) {
      return createErrorResponse(
        `Service '${this.id}' has no open connection`,
        `service:${this.id}`
      )
    }

    if (!isAuthorizedAction(action)) {
      return createErrorResponse(
        'Not authorized',
        `internal:service:${this.id}`,
        'autherror'
      )
    }

    // When an authentication is defined: Authenticate and apply result to action
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
        this.#auth?.getAuthObject(this.#transporter, null)
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

    if (this.#connection) {
      await this.#transporter.disconnect(this.#connection.object)
      this.#connection = null
      debug(`Closed`)
    } else {
      debug('No connection to disconnect')
    }

    return { status: 'ok' }
  }
}
