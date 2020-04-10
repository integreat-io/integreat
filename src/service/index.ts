import EventEmitter = require('events')
import prepareEndpointMappers from './endpoints'
import {
  requestFromExchange,
  responseToExchange,
} from '../utils/exchangeMapping'
import createError from '../utils/createError'
import { Dictionary, Response, Exchange } from '../types'
import { Service, ServiceDef, Adapter, MapOptions, Connection } from './types'
import { CustomFunction } from 'map-transform'
import { Schema } from '../schema'
import { Auth } from '../auth/types'
import { lookupById } from '../utils/indexUtils'
import * as authorizeData from './authorize/data'
import authorizeExchange from './authorize/exchange'

const isConnectionError = (
  connection: Connection | null
): connection is Connection =>
  !!connection && !['ok', 'noaction'].includes(connection.status)

interface Resources {
  adapters?: Dictionary<Adapter>
  auths?: Dictionary<Auth>
  transformers?: Dictionary<CustomFunction>
  schemas: Dictionary<Schema>
  mapOptions?: MapOptions
}

/**
 * Create a service with the given id and adapter.
 */
export default ({ adapters, auths, schemas, mapOptions = {} }: Resources) => ({
  id: serviceId,
  adapter: adapterId,
  auth: authId,
  meta,
  options = {},
  endpoints: endpointDefs = [],
  mappings: mappingsDef = {},
}: ServiceDef): Service => {
  if (typeof serviceId !== 'string' || serviceId === '') {
    throw new TypeError(`Can't create service without an id.`)
  }

  const adapter = lookupById(adapterId, adapters) || adapterId
  if (typeof adapter !== 'object' || adapter === null) {
    throw new TypeError(
      `Can't create service '${serviceId}' without an adapter.`
    )
  }

  mapOptions = { mutateNull: false, ...mapOptions }

  // TODO: Reimplement auth
  const auth = lookupById(authId, auths) || {}
  const requireAuth = !!authId

  const authorizeDataFromService = authorizeData.fromService(schemas)
  const authorizeDataToService = authorizeData.toService(schemas)

  const getEndpointMapper = prepareEndpointMappers(
    endpointDefs,
    mappingsDef,
    options,
    mapOptions,
    adapter.prepareEndpoint
  )

  let connection: Connection | null = null
  const emitter = new EventEmitter()

  // const sendOptions = {
  //   serviceId,
  //   schemas,
  //   adapter,
  //   auth,
  //   setConnection: (conn: Connection | null) => {
  //     connection = conn
  //   },
  //   serviceOptions: options,
  //   emit: emitter.emit.bind(emitter)
  // }

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
     * Map response data coming from the service
     */
    mapFromService(exchange: Exchange): Exchange {
      const { endpoint } = exchange
      if (!endpoint) {
        return exchange.status
          ? exchange
          : createError(exchange, 'No endpoint provided')
      }
      return authorizeDataFromService(endpoint.mapFromService(exchange))
    },

    /**
     * Map response data coming from the service
     */
    mapToService(exchange: Exchange): Exchange {
      const { endpoint } = exchange
      if (!endpoint) {
        return exchange.status
          ? exchange
          : createError(exchange, 'No endpoint provided')
      }
      return endpoint.mapToService(authorizeDataToService(exchange))
    },

    /**
     * The given exchange is sent to the service via the relevant adapter, and
     * the exchange is updated with the response from the service.
     */
    async sendExchange(exchange: Exchange): Promise<Exchange> {
      if (exchange.status) {
        return exchange
      }

      // TODO: Authenticate

      const {
        endpoint: { options = {} } = {},
        auth = { status: 'ok' },
      } = exchange
      let response: Response

      try {
        const nextConnection = await adapter.connect(options, auth, connection)
        if (isConnectionError(nextConnection)) {
          connection = null
          return createError(
            exchange,
            `Could not connect to service '${serviceId}': ${nextConnection.error}`
          )
        } else {
          connection = nextConnection
          const request = await adapter.serialize(requestFromExchange(exchange))
          response = await adapter.send(request, connection)
          response = await adapter.normalize(response, request)
        }
      } catch (error) {
        return createError(
          exchange,
          `Error retrieving from service '${serviceId}': ${error.message}`
        )
      }
      return responseToExchange(exchange, response)
    },

    /**
     * The given action is prepared, authenticated, and mapped, before it is
     * sent to the service via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     */
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

// export const afterService = composeWithOptions(
//   awaitAndAssign('response', authorizeResponse),
//   emitRequestAndResponse('mappedFromService'),
//   awaitAndAssign('response', mapFromService),
//   emitRequestAndResponse('mapFromService')
// )
//
// export const sendToService = composeWithOptions(
//   awaitAndAssign('response', normalizeResponse),
//   awaitAndAssign('response', sendRequest),
//   awaitAndAssign(null, connect),
//   awaitAndAssign(null, authenticate)
// )
//
// export const beforeService = composeWithOptions(
//   awaitAndAssign(null, serializeRequest),
//   emitRequestAndResponse('mappedToService'),
//   awaitAndAssign('request', mapToService),
//   emitRequestAndResponse('mapToService'),
//   awaitAndAssign('authorizedRequestData', extractRequestData),
//   awaitAndAssign(null, authorizeRequest)
// )
