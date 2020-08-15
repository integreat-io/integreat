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
  if (typeof transporter !== 'object' || transporter === null) {
    throw new TypeError(
      `Can't create service '${serviceId}' without a transporter.`
    )
  }

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
    transporter.prepareOptions
  )

  const connection = new Connection(transporter, options)

  // Create the service instance
  return {
    id: serviceId,
    meta,

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
      const { mutateRequest, allowRawRequest } = endpoint
      return exchange.incoming
        ? authorizeDataToService(mutateRequest(exchange), allowRawRequest)
        : mutateRequest(authorizeDataToService(exchange, allowRawRequest))
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
      const { mutateResponse, allowRawResponse } = endpoint
      return exchange.incoming
        ? mutateResponse(authorizeDataFromService(exchange, allowRawResponse))
        : authorizeDataFromService(mutateResponse(exchange), allowRawResponse)
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
      if (authorization) {
        await authorization.authenticate()
        exchange = authorization.applyToExchange(exchange, transporter)
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
  }
}

// const knownActions = ['GET', 'SET', 'DELETE', 'REQUEST']
//
// export const respondToUnknownAction = _options => args =>
//   args.request && knownActions.includes(args.request.action)
//     ? args
//     : { ...args, response: { status: 'noaction' } }
