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
     * Map and cast data coming _from_ the source to Integreat's internal data
     * format, according to the given type(s).
     *
     * Only the fields present in the data will be set on the returned data
     * objects. Set `useDefaults` to true to set the rest of the fields of the
     * datatype to their default values.
     *
     * @param {Object} data - The data to map and cast
     * @param {Object} options - type, params, useDefaults
     * @returns {Object[]} Always returns an array of data objects
     */
    mapFromSource (data, options) {
      return mapFromSource(data, mappings, options)
    },

    /**
     * Map data in Integreat's internal data format, going _to_ the source,
     * according to each data item's type.
     *
     * When given an array, this method will return an array. When given an
     * object, it will return a single object. If the mapping results in no
     * objects to return, an empty array or null will be returned – depending
     * on whether the data was an array or an object.
     *
     * @param {Object} data - The data to map
     * @returns {Object|Object[]} Returns a data object or an array of data objects
     */
    mapToSource (data) {
      return mapToSource(data, mappings)
    },

    /**
     * Will complete the given request object with endpoint and params, and
     * perform authorization on the request and the provided data.
     *
     * @param {Object} request - The request object to prepare
     * @param {Object} options - auth, endpoints, datatypes, and prepareEndpoint method
     * @returns {Object} The completed request
     */
    prepareRequest (request) {
      return prepareRequest(request, {auth, endpoints, datatypes, prepareEndpoint})
    },

    /**
     * Will perform authorization on the response and the provided data.
     *
     * @param {Object} response - The response object to prepare
     * @param {Object} request - The corresponding request object
     * @param {Object} datatypes - The datatypes object
     * @returns {Object} The completed request
     */
    prepareResponse (response, request) {
      return prepareResponse(response, request, datatypes)
    },

    /**
     * Serialize data and send to source.
     * @param {Object} request - Request object
     * @returns {Object} Response object
     */
    async send (request) {
      return sendRequest(request, {adapter, sourceId})
    }
  }
}

module.exports = source
