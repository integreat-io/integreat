import EventEmitter = require('events')
import R = require('ramda')
import compareEndpoints from '../endpoints/compareEndpoints'
import matchEndpoint from '../endpoints/matchEndpoint'
import prepareEndpoint from '../endpoints/prepareEndpoint'
import requestFromAction from './requestFromAction'
import {
  beforeService,
  sendToService,
  afterService,
  respondToUnknownAction
} from './send'
import createError from '../utils/createError'
import {
  Dictionary,
  ServiceDef,
  Response,
  Request,
  Action,
  Dispatch,
  Adapter,
  MapOptions,
  DataObject
} from '../types'
import { CustomFunction } from 'map-transform'
import { Schema } from '../schema'
import { Auth } from '../auth/types'
import { EndpointOptions } from '../endpoints/types'
import { lookupById } from '../utils/indexUtils'

interface IncomingEndpointOptions extends EndpointOptions {
  actionType?: string
  actionPayload?: DataObject
  actionMeta?: DataObject
}

const { compose } = R

const normalizeAction = async (action: Action, adapter: Adapter) => {
  const normalized = await adapter.normalize(
    { status: 'ok', data: action.payload.data },
    { endpoint: {} }
  )
  return { ...action, payload: { ...action.payload, data: normalized.data } }
}

const receiveRequestFromAction = (
  { type, payload: { data, ...params }, meta: { ident } = {} }: Action,
  endpoint: IncomingEndpointOptions
): Request => ({
  action: type,
  params: {
    ...endpoint.actionPayload,
    ...params
  },
  endpoint,
  access: ident ? { ident } : undefined
})

const receiveAfterArgs = (action: Action, request: Request, endpoint) => ({
  request,
  response: { status: 'ok', data: action.payload.data },
  requestMapper: endpoint.requestMapper,
  responseMapper: endpoint.responseMapper,
  mappings: endpoint.mappings
})

const receiveBeforeArgs = (
  { data, status, error }: Response,
  request: Request,
  endpoint
) => ({
  request: { ...request, data, params: { ...request.params, status, error } },
  requestMapper: endpoint.requestMapper,
  responseMapper: endpoint.responseMapper,
  mappings: endpoint.mappings
})

const createNextAction = (
  action: Action,
  options: IncomingEndpointOptions,
  mappedResponse: Response
) => ({
  type: options.actionType,
  payload: {
    type: action.payload.type,
    ...options.actionPayload,
    ...mappedResponse.params,
    ...(mappedResponse.data ? { data: mappedResponse.data } : {})
  },
  meta: { ...action.meta, ...options.actionMeta }
})

const wrapResponse = (response: Response) => ({ response })

interface Resources {
  adapters: Dictionary<Adapter>
  auths?: Dictionary<Auth>
  transformers?: Dictionary<CustomFunction>
  schemas: Dictionary<Schema>
  mapOptions?: MapOptions
}

/**
 * Create a service with the given id and adapter.
 */
const service = ({
  adapters,
  auths,
  transformers = {},
  schemas,
  mapOptions
}: Resources) => ({
  id: serviceId,
  adapter: adapterId,
  auth: authId,
  meta = null,
  options = {},
  endpoints: endpointDefs = [],
  mappings: mappingsDef = {}
}: ServiceDef) => {
  if (typeof serviceId !== 'string' || serviceId === '') {
    throw new TypeError(`Can't create service without an id.`)
  }

  const adapter = lookupById(adapterId, adapters) || adapterId
  if (typeof adapter !== 'object' || adapter === null) {
    throw new TypeError(
      `Can't create service '${serviceId}' without an adapter.`
    )
  }

  const auth = lookupById(authId, auths) || {}

  const endpoints = endpointDefs
    .map(
      prepareEndpoint(adapter, transformers, options, mappingsDef, mapOptions)
    )
    .sort(compareEndpoints)

  let connection: object | null = null
  const emitter = new EventEmitter()

  const sendOptions = {
    serviceId,
    schemas,
    adapter,
    auth,
    setConnection: (conn: object) => {
      connection = conn
    },
    serviceOptions: options,
    emit: emitter.emit.bind(emitter)
  }

  const beforeServiceFn = beforeService(sendOptions)
  const afterServiceFn = afterService(sendOptions)

  const sendFn = compose(
    afterServiceFn,
    sendToService(sendOptions),
    beforeServiceFn,
    respondToUnknownAction(sendOptions)
  )

  // Create the service instance
  return {
    id: serviceId,
    adapter,
    meta,
    endpoints,
    on: emitter.on.bind(emitter),

    /**
     * The given action is prepared, authenticated, and mapped, before it is
     * sent to the service via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     */
    async send(action: Action) {
      const endpoint = matchEndpoint(endpoints)(action)
      if (!endpoint) {
        return {
          response: createError(
            `No endpoint matching request to service '${serviceId}'.`,
            'noaction'
          )
        }
      }

      const validateRes = endpoint.validate(action)
      if (validateRes !== null) {
        return { response: validateRes }
      }

      return sendFn({
        request: requestFromAction(action, { endpoint, schemas }),
        requestMapper: endpoint.requestMapper,
        responseMapper: endpoint.responseMapper,
        mappings: endpoint.mappings,
        connection
      })
    },

    /**
     * The given action is prepared, authenticated, and mapped – as coming
     * _from_ the service. It is then made into an action and dispatched.
     * The response from the action is mapped, authenticated, and returned – for
     * going _to_ the service.
     */
    async receive(action: Action, dispatch: Dispatch) {
      action = await normalizeAction(action, adapter)
      const endpoint = matchEndpoint(endpoints)(action)
      if (!endpoint) {
        return wrapResponse(
          createError(
            `No endpoint matching request to service '${serviceId}'.`,
            'noaction'
          )
        )
      }

      const validateRes = endpoint.validate(action)
      if (validateRes !== null) {
        return wrapResponse(validateRes)
      }

      if (!endpoint.options || !endpoint.options.actionType) {
        return wrapResponse(
          createError(
            `The matching endpoint on service '${serviceId}' did not specify an action type`,
            'noaction'
          )
        )
      }

      const request = receiveRequestFromAction(action, endpoint.options)
      const mapped = await afterServiceFn(
        receiveAfterArgs(action, request, endpoint)
      )
      const nextAction = createNextAction(
        action,
        endpoint.options,
        mapped.response
      )

      const response = await dispatch(nextAction)

      const serialized = await beforeServiceFn(
        receiveBeforeArgs(response, request, endpoint)
      )

      return wrapResponse({
        ...response,
        ...(serialized.request.data ? { data: serialized.request.data } : {}),
        access: serialized.request.access
      })
    }
  }
}

export default service
