import EventEmitter = require('events')
import { CustomFunction } from 'map-transform'
import createEndpointMappers from './endpoints'
import createError from '../utils/createError'
import { Exchange, Transporter } from '../types'
import { Service, ServiceDef, MapOptions } from './types'
import Connection from './Connection'
import { Schema } from '../schema'
import Auth from './Auth'
import { lookupById } from '../utils/indexUtils'
import * as authorizeData from './authorize/data'
import authorizeExchange from './authorize/exchange'

interface Resources {
  transporters?: Record<string, Transporter>
  auths?: Record<string, Auth>
  transformers?: Record<string, CustomFunction>
  schemas: Record<string, Schema>
  mapOptions?: MapOptions
}

/**
 * Create a service with the given id and transporter.
 */
export default ({
  transporters,
  auths,
  schemas,
  mapOptions = {},
}: Resources) => ({
  id: serviceId,
  transporter: transporterId,
  auth: authId,
  meta,
  options = {},
  mutation,
  endpoints: endpointDefs = [],
}: ServiceDef): Service => {
  if (typeof serviceId !== 'string' || serviceId === '') {
    throw new TypeError(`Can't create service without an id.`)
  }

  const transporter = lookupById(transporterId, transporters) || transporterId
  if (typeof transporter !== 'object' || transporter === null) {
    throw new TypeError(
      `Can't create service '${serviceId}' without a transporter.`
    )
  }

  mapOptions = { mutateNull: false, ...mapOptions }

  const auth = lookupById(authId, auths)
  const requireAuth = !!authId

  const authorizeDataFromService = authorizeData.fromService(schemas)
  const authorizeDataToService = authorizeData.toService(schemas)

  const getEndpointMapper = createEndpointMappers(
    endpointDefs,
    options,
    mapOptions,
    mutation,
    transporter.prepareOptions
  )

  const connection = new Connection(transporter, options)
  const emitter = new EventEmitter()

  // Create the service instance
  return {
    id: serviceId,
    meta,
    on: emitter.on.bind(emitter),

    /**
     * Find the endpoint mapper that best matches the given exchange, and assign
     * it to the exchange.
     */
    assignEndpointMapper(exchange: Exchange): Exchange {
      const endpoint = getEndpointMapper(exchange)

      if (endpoint) {
        return { ...exchange, endpoint }
      } else {
        return createError(
          exchange,
          `No endpoint matching ${exchange.type} request to service '${serviceId}'.`,
          'noaction'
        )
      }
    },

    /**
     * Authorize the exchange. Sets the authorized flag if okay, otherwise sets
     * an appropriate status and error.
     */
    authorizeExchange: authorizeExchange(schemas, requireAuth),

    /**
     * Map request. Will authorize data and map exchange – in that order – when
     * this is an outgoing requst, and will do it in reverse for an incoming
     * request.
     */
    mapRequest(exchange: Exchange): Exchange {
      // Require endpoint
      const { endpoint } = exchange
      if (!endpoint) {
        return exchange.status && exchange.status !== 'ok'
          ? exchange
          : createError(exchange, 'No endpoint provided')
      }

      // Authorize and map in right order
      return exchange.incoming
        ? authorizeDataToService(endpoint.mutateRequest(exchange))
        : endpoint.mutateRequest(authorizeDataToService(exchange))
    },

    /**
     * Map response. Will map exchange and authorize data – in the order – when
     * this is the response from an outgoing request. Will do it in the reverse
     * order for a response to an incoming request.
     */
    mapResponse(exchange: Exchange): Exchange {
      // Require endpoint
      const { endpoint } = exchange
      if (!endpoint) {
        return exchange.status
          ? exchange
          : createError(exchange, 'No endpoint provided')
      }

      // Authorize and map in right order
      return exchange.incoming
        ? endpoint.mutateResponse(authorizeDataFromService(exchange))
        : authorizeDataFromService(endpoint.mutateResponse(exchange))
    },

    /**
     * The given exchange is sent to the service via the relevant transporter,
     * and the exchange is updated with the response from the service.
     */
    async sendExchange(exchange: Exchange): Promise<Exchange> {
      if (exchange.status) {
        return exchange
      }

      if (!exchange.authorized) {
        return {
          ...exchange,
          status: 'error',
          response: { error: 'Not authorized' },
        }
      }

      // When an authenticator is set: Authenticate and apply result to exchange
      if (auth) {
        await auth.authenticate()
        exchange = auth.applyToExchange(exchange, transporter)
        if (exchange.status) {
          return exchange
        }
      }

      try {
        if (await connection.connect(exchange.auth)) {
          const ret = await transporter.send(exchange, connection.object)
          return ret
        } else {
          return createError(
            exchange,
            `Could not connect to service '${serviceId}'. [${
              connection.status
            }] ${connection.error || ''}`.trim()
          )
        }
      } catch (error) {
        return createError(
          exchange,
          `Error retrieving from service '${serviceId}': ${error.message}`
        )
      }
    },

    // async send(action: Action) {
    //   const endpoint = matchEndpoint(oldEndpoints)(action)
    //   if (!endpoint) {
    //     return {
    //       response: createError(
    //         `No endpoint matching request to service '${serviceId}'.`,
    //         'noaction'
    //       )
    //     }
    //   }
    //
    //   const validateRes = endpoint.validate(action)
    //   if (validateRes !== null) {
    //     return { response: validateRes }
    //   }
    //
    //   return sendFn({
    //     request: requestFromAction(action, { endpoint, schemas }),
    //     requestMapper: endpoint.requestMapper,
    //     responseMapper: endpoint.responseMapper,
    //     mappings: endpoint.mappings,
    //     connection
    //   })
    // }

    /**
     * The given action is prepared, authenticated, and mapped – as coming
     * _from_ the service. It is then made into an action and dispatched.
     * The response from the action is mapped, authenticated, and returned – for
     * going _to_ the service.
     */
    // async receive(action: Action, dispatch: Dispatch) {
    //   action = await normalizeAction(action, adapter)
    //   const endpoint = matchEndpoint(oldEndpoints)(action)
    //   if (!endpoint) {
    //     return wrapResponse(
    //       createError(
    //         `No endpoint matching request to service '${serviceId}'.`,
    //         'noaction'
    //       )
    //     )
    //   }
    //
    //   const validateRes = endpoint.validate(action)
    //   if (validateRes !== null) {
    //     return wrapResponse(validateRes)
    //   }
    //
    //   if (!endpoint.options || !endpoint.options.actionType) {
    //     return wrapResponse(
    //       createError(
    //         `The matching endpoint on service '${serviceId}' did not specify an action type`,
    //         'noaction'
    //       )
    //     )
    //   }
    //
    //   const request = receiveRequestFromAction(action, endpoint.options)
    //   const mapped = await afterServiceFn(
    //     receiveAfterArgs(action, request, endpoint)
    //   )
    //   const nextAction = createNextAction(
    //     action,
    //     endpoint.options,
    //     mapped.response
    //   )
    //
    //   const response = await dispatch(nextAction)
    //
    //   const serialized = await beforeServiceFn(
    //     receiveBeforeArgs(response, request, endpoint)
    //   )
    //
    //   return wrapResponse({
    //     ...response,
    //     ...(serialized.request.data ? { data: serialized.request.data } : {}),
    //     access: serialized.request.access
    //   })
    // }
  }
}

// const knownActions = ['GET', 'SET', 'DELETE', 'REQUEST']
//
// export const respondToUnknownAction = _options => args =>
//   args.request && knownActions.includes(args.request.action)
//     ? args
//     : { ...args, response: { status: 'noaction' } }
