const reduceToObject = require('../utils/reduceToObject')
const compareEndpoints = require('../utils/compareEndpoints')
const prepareRequest = require('./prepareRequest')
const prepareResponse = require('./prepareResponse')
const sendRequest = require('./sendRequest')
const mapFromSource = require('./mapFromSource')
const mapToSource = require('./mapToSource')

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id

/**
 * Create a source with the given id and adapter.
 * @param {Object} def - Source definition
 * @param {Object} resources - Object with mappings, adapters, auths, and plurals
 * @returns {Object} The created source
 */
function source (
  {
    id: sourceId,
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
  if (!sourceId) {
    throw new TypeError(`Can't create source without an id.`)
  }
  // Switch adapter id with the actual adapter
  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create source '${sourceId}' without an adapter.`)
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

  // Prepare all mappings for this source
  const mappings = allMappings
    .filter((mapping) => [].concat(mapping.source).includes(sourceId))
    .reduce(reduceToObject('type'), {})

  // Add mappings that are defined on the source by id
  mappingIds.forEach((mappingId) => {
    const mapping = allMappings.find((mapping) => mapping.id === mappingId)
    if (mapping) {
      mappings[mapping.type] = mapping
    }
  })

  // Convenience object for datatypes found in mappings
  const datatypes = Object.keys(mappings)
    .reduce((datatypes, key) => ({...datatypes, [key]: mappings[key].datatype}), {})

  // Create the source instance
  return {
    id: sourceId,
    adapter,
    meta,
    endpoints,

    /**
     * The given request is prepared, authenticated, and mapped, before it is
     * sent to the source via the adapter. The response from the adapter is then
     * mapped, authenticated, and returned.
     *
     * The prepared and authenticated request is also returned.
     *
     * @param {Object} request - Request object to send
     * @param {Object} options - useDefaults and unmapped
     * @returns {Object} Object with the sent request and the received response
     */
    async send (request, {useDefaults = false, unmapped = false} = {}) {
      const preparedRequest = prepareRequest(request, {auth, endpoints, datatypes, prepareEndpoint, useDefaults})

      const {params, data} = preparedRequest
      const toData = mapToSource(data, mappings)

      let response = await sendRequest({...preparedRequest, data: toData}, {adapter, sourceId})

      if (response.data && !unmapped) {
        response = {
          ...response,
          data: mapFromSource(response.data, mappings, {params, useDefaults})
        }
      }

      const preparedResponse = prepareResponse(response, preparedRequest, {datatypes, unmapped})

      return {request: preparedRequest, response: preparedResponse}
    }
  }
}

module.exports = source
