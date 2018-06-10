const reduceToObject = require('../utils/reduceToObject')
const compareEndpoints = require('../utils/compareEndpoints')
const prepareRequest = require('./prepareRequest')
const prepareResponse = require('./prepareResponse')
const sendRequest = require('./sendRequest')
const mapFromService = require('./mapFromService')
const mapToService = require('./mapToService')
const authorizeRequest = require('./authorizeRequest')
const authorizeItems = require('./authorizeItems')

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id

const castData = (request, schemas, useDefaults) => {
  const castOne = (item) => (schemas[item.type]) ? schemas[item.type].cast(item, {useDefaults}) : undefined
  const data = (Array.isArray(request.data))
    ? request.data.map(castOne).filter((item) => !!item)
    : request.data && castOne(request.data)
  return {...request, data}
}

const authorizeRequestAndData = (request, schemas) => {
  const req = authorizeRequest(request, schemas)
  return {...req, ...authorizeItems(req, schemas)}
}

/**
 * Create a service with the given id and adapter.
 * @param {Object} def - Service definition
 * @param {Object} resources - Object with mappings, adapters, auths, and plurals
 * @returns {Object} The created service
 */
function service (
  {
    id: serviceId,
    adapter,
    auth = null,
    meta = null,
    baseUri = null,
    endpoints = [],
    mappings: mappingIds = []
  },
  {
    mappings: allMappings = [],
    adapters = {},
    auths = {}
  } = {}
) {
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
  const prepareEndpoint = (options) => adapter.prepareEndpoint(options, {baseUri})
  endpoints = endpoints
    .map((endpoint) => ({
      ...endpoint,
      options: prepareEndpoint(endpoint.options)
    }), {})
    .sort(compareEndpoints)

  // Prepare all mappings for this service
  const mappings = allMappings
    .filter((mapping) => [].concat(mapping.service).includes(serviceId))
    .reduce(reduceToObject('type'), {})

  // Add mappings that are defined on the service by id
  mappingIds.forEach((mappingId) => {
    const mapping = allMappings.find((mapping) => mapping.id === mappingId)
    if (mapping) {
      mappings[mapping.type] = mapping
    }
  })

  // Convenience object for schemas found in mappings
  const schemas = Object.keys(mappings)
    .reduce((schemas, key) => ({...schemas, [key]: mappings[key].schema}), {})

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
    async send (request, {useDefaults = false, unmapped = false} = {}) {
      const preparedRequest = prepareRequest(request, {auth, endpoints, schemas, prepareEndpoint, useDefaults})
      const castedRequest = castData(preparedRequest, schemas, useDefaults)
      const authorizedRequest = authorizeRequestAndData(castedRequest, schemas)

      const {params, data} = authorizedRequest
      const toData = mapToService(data, mappings)

      let response = await sendRequest({...authorizedRequest, data: toData}, {adapter, serviceId})

      if (response.data && !unmapped) {
        response = {
          ...response,
          data: mapFromService(response.data, mappings, {params, useDefaults})
        }
      }

      const preparedResponse = prepareResponse(response, authorizedRequest, {schemas, unmapped})

      return {request: authorizedRequest, response: preparedResponse}
    }
  }
}

module.exports = service
