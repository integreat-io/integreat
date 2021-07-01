import createEndpointMappers from './endpoints'
import createError from '../utils/createError'
import { Action, Middleware, Transporter } from '../types'
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
        return createError(
          action,
          `Could not connect to service '${serviceId}'. [${
            connection.status
          }] ${connection.error || ''}`.trim()
        )
      }
    } catch (error) {
      return createError(
        action,
        `Error retrieving from service '${serviceId}': ${error.message}`
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
    meta,
    options = {},
    mutation,
    endpoints: endpointDefs = [],
  }: ServiceDef): Service => {
    if (typeof serviceId !== 'string' || serviceId === '') {
      throw new TypeError(`Can't create service without an id.`)
    }

    const transporter = lookupById(transporterId, transporters) || transporterId

    mapOptions = { mutateNull: false, ...mapOptions }

    const authorization =
      typeof auth === 'string' ? lookupById(auth, auths) : undefined
    const requireAuth = !!auth

    const authorizeDataFromService = authorizeData.fromService(schemas)
    const authorizeDataToService = authorizeData.toService(schemas)

    const getEndpointMapper = createEndpointMappers(
      endpointDefs,
      options,
      mapOptions,
      mutation,
      isTransporter(transporter) ? transporter.prepareOptions : undefined
    )

    const runThroughMiddleware: Middleware =
      middleware.length > 0 ? compose(...middleware) : (fn) => fn

    const connection = isTransporter(transporter)
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

        if (!isTransporter(transporter) || !connection) {
          return createError(
            action,
            `Service '${serviceId}' has no transporter`
          )
        }

        if (!action.meta?.authorized) {
          return createError(action, 'Not authorized')
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
    }
  }

// const knownActions = ['GET', 'SET', 'DELETE']
//
// export const respondToUnknownAction = _options => args =>
//   args.request && knownActions.includes(args.request.action)
//     ? args
//     : { ...args, response: { status: 'noaction' } }
