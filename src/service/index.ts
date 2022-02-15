import PProgress = require('p-progress')
import createEndpointMappers from './endpoints'
import { createErrorOnAction, createErrorResponse } from '../utils/createError'
import { Action, Response, Dispatch, Middleware, Transporter } from '../types'
import { Service, ServiceDef, MapOptions } from './types'
import Connection from './Connection'
import { Schema } from '../schema'
import Auth from './Auth'
import { lookupById } from '../utils/indexUtils'
import { isObject } from '../utils/is'
import deepClone from '../utils/deepClone'
import * as authorizeData from './authorize/data'
import authorizeAction from './authorize/action'
import { compose } from '../dispatch'

interface Resources {
  transporters?: Record<string, Transporter>
  auths?: Record<string, Auth>
  schemas: Record<string, Schema>
  mapOptions?: MapOptions
  middleware?: Middleware[]
}

const setServiceIdAsSourceServiceOnAction = (
  action: Action | null,
  serviceId: string,
  incomingIdent?: string
) =>
  action
    ? {
        ...action,
        payload: { ...action.payload, sourceService: serviceId },
        meta: {
          ident: incomingIdent ? { id: incomingIdent } : undefined,
          ...action.meta,
        },
      }
    : null

// TODO: Consider if this is the correct approach - it's very convoluted and
// require tests for the progress part
const setServiceIdOnDispatchedAction =
  (dispatch: Dispatch, serviceId: string, incomingIdent?: string) =>
  (action: Action | null) =>
    new PProgress<Response>(async (resolve, _reject, setProgress) => {
      const p = dispatch(
        setServiceIdAsSourceServiceOnAction(action, serviceId, incomingIdent)
      )
      p.onProgress(setProgress)
      const response = await p
      resolve(response)
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
        return {
          ...action,
          response: {
            ...action.response,
            ...response,
          },
        }
      } else {
        return createErrorOnAction(
          action,
          `Could not connect to service '${serviceId}'. [${
            connection.status
          }] ${connection.error || ''}`.trim()
        )
      }
    } catch (error) {
      return createErrorOnAction(
        action,
        `Error retrieving from service '${serviceId}': ${
          (error as Error).message
        }`
      )
    }
  }

/**
 * Create a service with the given id and transporter.
 */
export default ({
    transporters,
    auths,
    schemas,
    mapOptions = {},
    middleware = [],
  }: Resources) =>
  ({
    id: serviceId,
    transporter: transporterId,
    auth,
    incomingIdent,
    meta,
    options = {},
    mutation,
    endpoints: endpointDefs = [],
  }: ServiceDef): Service => {
    if (typeof serviceId !== 'string' || serviceId === '') {
      throw new TypeError(`Can't create service without an id.`)
    }

    const transporter = lookupById(transporterId, transporters)

    mapOptions = { mutateNull: false, ...mapOptions }

    const authorization =
      typeof auth === 'string' ? lookupById(auth, auths) : undefined
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

    const runThroughMiddleware: Middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    let connection = isTransporter(transporter)
      ? new Connection(transporter, options)
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
      mapRequest(action, endpoint, isIncoming = false) {
        const { mutateRequest, allowRawRequest } = endpoint

        // Set endpoint options on action
        const nextAction = {
          ...action,
          meta: { ...action.meta, options: deepClone(endpoint.options) },
        }

        // Authorize and map in right order
        return isIncoming
          ? authorizeDataToService(
              mutateRequest(nextAction, isIncoming),
              allowRawRequest
            )
          : mutateRequest(
              authorizeDataToService(nextAction, allowRawRequest),
              isIncoming
            )
      },

      /**
       * Map response. Will map action and authorize data – in the order – when
       * this is the response from an outgoing request. Will do it in the reverse
       * order for a response to an incoming request.
       */
      mapResponse(action, endpoint, isIncoming = false) {
        // Authorize and map in right order
        const { mutateResponse, allowRawResponse } = endpoint
        return isIncoming
          ? mutateResponse(
              authorizeDataFromService(action, allowRawResponse),
              isIncoming
            )
          : authorizeDataFromService(
              mutateResponse(action, isIncoming),
              allowRawResponse
            )
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
          return createErrorOnAction(
            action,
            `Service '${serviceId}' has no transporter`
          )
        }
        if (!connection) {
          return createErrorOnAction(
            action,
            `Service '${serviceId}' has no connection`
          )
        }

        if (!action.meta?.authorized) {
          return createErrorOnAction(action, 'Not authorized')
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
        if (!isTransporter(transporter)) {
          return createErrorResponse(
            `Service '${serviceId}' has no transporter`
          )
        }
        if (!connection) {
          return createErrorResponse(`Service '${serviceId}' has no connection`)
        }

        if (typeof transporter.listen !== 'function') {
          return createErrorResponse(
            'Transporter has no listen method',
            'noaction'
          )
        }

        if (authorization && !(await authorization.authenticate(null))) {
          return authorization.getStatusObject()
        }

        if (
          !(await connection.connect(authorization?.getAuthObject(transporter)))
        ) {
          return createErrorResponse(
            `Could not listen to '${serviceId}' service. Failed to connect`
          )
        }

        return transporter.listen(
          setServiceIdOnDispatchedAction(dispatch, serviceId, incomingIdent),
          connection.object
        )
      },

      /**
       * Will disconnect the transporter
       */
      async close() {
        if (!isTransporter(transporter) || !connection) {
          return createErrorResponse('No transporter to disconnect', 'noaction')
        }

        await transporter.disconnect(connection.object)
        connection = null
        return { status: 'ok' }
      },
    }
  }

// const knownActions = ['GET', 'SET', 'DELETE']
//
// export const respondToUnknownAction = _options => args =>
//   args.request && knownActions.includes(args.request.action)
//     ? args
//     : { ...args, response: { status: 'noaction' } }
