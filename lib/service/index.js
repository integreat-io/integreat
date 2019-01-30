const EventEmitter = require('events')
const { compose, identity } = require('ramda')
const prepareEndpoints = require('../endpoints')
const requestFromAction = require('./requestFromAction')
const { beforeService, sendToService, afterService, respondToUnknownMethod } = require('./send')
const createError = require('../utils/createError')

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id

const normalizeAction = async (action, adapter) => {
  const normalized = await adapter.normalize({ status: 'ok', data: action.payload.data }, { endpoint: {} })
  return { ...action, payload: { ...action.payload, data: normalized.data } }
}

const receiveRequestFromAction = ({ type, payload: { data, ...params }, meta: { ident } }, endpoint) =>
  ({
    method: 'QUERY',
    action: type,
    params: {
      ...endpoint.options.actionPayload,
      ...params
    },
    endpoint: endpoint.options,
    access: { ident }
  })

const receiveAfterArgs = (action, request, endpoint) => ({
  request,
  response: ({ status: 'ok', data: action.payload.data }),
  requestMapper: endpoint.requestMapper,
  responseMapper: endpoint.responseMapper,
  mappings: endpoint.mappings
})

const receiveBeforeArgs = ({ data, status, error }, request, endpoint) => ({
  request: { ...request, data, params: { ...request.params, status, error } },
  requestMapper: endpoint.requestMapper,
  responseMapper: endpoint.responseMapper,
  mappings: endpoint.mappings
})

const createNextAction = (action, endpoint, mappedResponse) => ({
  type: endpoint.options.actionType,
  payload: {
    ...((action.payload.type) ? { type: action.payload.type } : {}),
    ...endpoint.options.actionPayload,
    ...mappedResponse.params,
    ...((mappedResponse.data) ? { data: mappedResponse.data } : {})
  },
  meta: { ...action.meta }
})

/**
 * Create a service with the given id and adapter.
 * @param {Object} def - Service definition
 * @param {Object} resources - Object with mappings, adapters, auths, and plurals
 * @returns {Object} The created service
 */
const service = ({
  adapters = {},
  auths = {},
  transformers = {},
  schemas,
  setupMapping = identity
} = {}) => ({
  id: serviceId,
  adapter,
  auth = null,
  meta = null,
  options = {},
  endpoints = [],
  mappings: mappingsDef = {}
}) => {
  if (!serviceId) {
    throw new TypeError(`Can't create service without an id.`)
  }

  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create service '${serviceId}' without an adapter.`)
  }

  endpoints = prepareEndpoints({ endpoints, options, mappings: mappingsDef }, { adapter, transformers, setupMapping })
  auth = lookup(auth, auths) || {}
  let connection = null
  const emitter = new EventEmitter()

  const sendOptions = {
    serviceId,
    schemas,
    adapter,
    authenticator: auth.authenticator,
    authOptions: auth.options,
    setAuthentication: (authentication) => { auth.authentication = authentication },
    setConnection: (conn) => { connection = conn },
    serviceOptions: options,
    emit: emitter.emit.bind(emitter)
  }

  const beforeServiceFn = beforeService(sendOptions)
  const afterServiceFn = afterService(sendOptions)

  const sendFn = compose(
    afterServiceFn,
    sendToService(sendOptions),
    beforeServiceFn,
    respondToUnknownMethod(sendOptions)
  )

  // Create the service instance
  return {
    id: serviceId,
    adapter,
    meta,
    endpoints: endpoints.list,
    on: emitter.on.bind(emitter),

    /**
     * The given action is prepared, authenticated, and mapped, before it is
     * sent to the service via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     *
     * @param {Object} action - Action object to map and send to the service
     * @returns {Object} Object with the sent request and the received response
     */
    async send (action) {
      const endpoint = endpoints.match(action)
      if (!endpoint) {
        return { response: createError(`No endpoint matching request to service '${serviceId}'.`, 'noaction') }
      }

      return sendFn({
        request: requestFromAction(action, { endpoint, schemas }),
        authentication: auth.authentication,
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
     *
     * @param {Object} action - Action object to map from the service
     * @param {Object} dispatch - A dispatch function
     * @returns {Object} Object with the received response
     */
    async receive (action, dispatch) {
      action = await normalizeAction(action, adapter)
      const endpoint = endpoints.match(action)
      if (!endpoint) {
        return { response: createError(`No endpoint matching request to service '${serviceId}'.`, 'noaction') }
      }
      if (!endpoint.options || !endpoint.options.actionType) {
        return {
          response: createError(`The matching endpoint on service '${serviceId}' did not specify an action type`, 'noaction')
        }
      }

      const request = receiveRequestFromAction(action, endpoint)
      const mapped = await afterServiceFn(receiveAfterArgs(action, request, endpoint))
      const nextAction = createNextAction(action, endpoint, mapped.response)

      const response = await dispatch(nextAction)

      const serialized = await beforeServiceFn(receiveBeforeArgs(response, request, endpoint))

      return {
        response: {
          ...response,
          ...((serialized.request.data) ? { data: serialized.request.data } : {}),
          access: serialized.request.access
        }
      }
    }
  }
}

module.exports = service
