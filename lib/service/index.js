const R = require('ramda')
const prepareEndpoints = require('./prepareEndpoints')
const getEndpoint = require('../utils/getEndpoint')
const prepareRequest = require('./prepareRequest')
const prepareResponse = require('./prepareResponse')
const sendRequest = require('./sendRequest')
const mapFromService = require('./mapFromService')
const mapToService = require('./mapToService')
const authorizeRequest = require('./authorizeRequest')
const authorizeItems = require('./authorizeItems')

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id

const castData = (request, schemas, useDefaults) => {
  const castOne = (item) => (schemas[item.type]) ? schemas[item.type].cast(item, { useDefaults }) : undefined
  const data = (Array.isArray(request.data))
    ? request.data.map(castOne).filter((item) => !!item)
    : request.data && castOne(request.data)
  return { ...request, data }
}

const authorizeRequestAndData = (request, schemas) => {
  const req = authorizeRequest(request, schemas)
  return { ...req, ...authorizeItems(req, schemas) }
}

const findEndpoint = (endpoints, request) =>
  (request.endpoint && typeof request.endpoint !== 'string')
    ? { options: request.endpoint }
    : getEndpoint(endpoints, request)

/**
 * Create a service with the given id and adapter.
 * @param {Object} def - Service definition
 * @param {Object} resources - Object with mappings, adapters, auths, and plurals
 * @returns {Object} The created service
 */
const service = ({
  mappings: allMappings = [],
  adapters = {},
  auths = {},
  setupMapping = R.identity
} = {}) => ({
  id: serviceId,
  adapter,
  auth = null,
  meta = null,
  options: serviceOptions = {},
  endpoints = [],
  mappings: mappingsDef = {}
}) => {
  if (!serviceId) {
    throw new TypeError(`Can't create service without an id.`)
  }
  // Switch adapter id with the actual adapter
  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create service '${serviceId}' without an adapter.`)
  }

  // Switch an auth id with actual auth object
  auth = lookup(auth, auths)

  // Prepare endpoints
  endpoints = prepareEndpoints(endpoints, adapter, serviceOptions)

  // Prepare all mappings for this service
  const prepareMappings = R.compose(
    R.map(setupMapping),
    R.mapObjIndexed((mapping, type) => ({ ...mapping, type })),
    R.filter(R.complement(R.isNil)),
    R.map((mapping) => (typeof mapping === 'string')
      ? allMappings.find((m) => m.id === mapping) : mapping)
  )
  const mappings = prepareMappings(mappingsDef)

  // Convenience object for schemas found in mappings
  const schemas = Object.keys(mappings)
    .reduce((schemas, key) => ({ ...schemas, [key]: mappings[key].schema }), {})

  // Create the service instance
  return {
    id: serviceId,
    adapter,
    meta,
    endpoints,

    /**
     * The given request is prepared, authenticated, and mapped, before it is
     * sent to the service via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     *
     * @param {Object} request - Request object to send
     * @param {Object} options - useDefaults and unmapped
     * @returns {Object} Object with the sent request and the received response
     */
    async send (request, { useDefaults = false, unmapped = false } = {}) {
      const endpoint = findEndpoint(endpoints, request)
      request = prepareRequest(request, { auth, schemas, endpoint })
      request = castData(request, schemas, useDefaults)
      request = authorizeRequestAndData(request, schemas)

      let response = await sendRequest(
        mapToService(request, { mappings, endpoint }),
        { adapter, serviceId }
      )

      if (response.data && !unmapped) {
        response = mapFromService(response, { mappings, request, useDefaults, endpoint })
      }
      response = prepareResponse(response, request, { schemas, unmapped })

      return { request, response }
    }
  }
}

module.exports = service
