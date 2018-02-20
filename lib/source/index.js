const util = require('util')
const reduceToObject = require('../utils/reduceToObject')
const createError = require('../utils/createError')
const compareEndpoints = require('../utils/compareEndpoints')
const prepareRequest = require('./prepareRequest')
const prepareResponse = require('./prepareResponse')

const flatten = (sup, sub) => sup.concat(sub)

const lookup = (id, resource) => (typeof id === 'string') ? resource[id] : id
const lookupHooks = (hook, hooks) => [].concat(hook).map((hook) => lookup(hook, hooks))

const invokeHooks = async (hooks, object, source) => {
  for (const hook of hooks) {
    if (typeof hook === 'function') {
      await hook(object, {source})
    }
  }
}

/**
 * Create a source with the given id and adapter.
 * @param {Object} def - Source definition
 * @param {Object} resources - Object with mappings, adapters, auths, hooks, and plurals
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
    mappings: mappingIds = [],
    beforeRetrieve,
    afterRetrieve,
    afterNormalize,
    beforeSerialize,
    beforeSend,
    afterSend
  },
  {
    mappings: allMappings = [],
    adapters = {},
    auths = {},
    hooks = {}
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

  // Prepare hooks
  beforeRetrieve = lookupHooks(beforeRetrieve, hooks)
  afterRetrieve = lookupHooks(afterRetrieve, hooks)
  afterNormalize = lookupHooks(afterNormalize, hooks)
  beforeSerialize = lookupHooks(beforeSerialize, hooks)
  beforeSend = lookupHooks(beforeSend, hooks)
  afterSend = lookupHooks(afterSend, hooks)

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

  // Create the Integreat instance
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
    mapFromSource (data, {type, params = {}, useDefaults = false}) {
      if (!type || !data) {
        return []
      }

      const mapWithType = (type) => (mappings[type])
        ? mappings[type].fromSource(data, params, {useDefaults}) : []

      return [].concat(type)
        .map((type) => mapWithType(type))
        .reduce(flatten, [])
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
      if (!data) {
        return null
      }

      const mapped = [].concat(data).map((item) => {
        if (mappings[item.type]) {
          return mappings[item.type].toSource(item)
        }
      })
      .filter((item) => item !== undefined)

      return (Array.isArray(data)) ? mapped : mapped[0] || null
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
     * Retrieve raw data from source
     * @param {Object} request - Request object
     * @returns {Object} Response object
     */
    async retrieveRaw (request) {
      await invokeHooks(beforeRetrieve, request, this)

      let response
      try {
        response = await adapter.send(request)
      } catch (error) {
        response = createError(`Error retrieving from ${request.uri}. ${error}`)
      }

      await invokeHooks(afterRetrieve, response, this)

      return response
    },

    /**
     * Retrieve data from source and normalize it
     * @param {Object} request - Request object
     * @returns {Object} Response object
     */
    async retrieve (request) {
      const {endpoint, access} = request
      if (!endpoint) {
        return createError(`No endpoint specified on request to source '${sourceId}'.`)
      }

      if (access.status === 'refused') {
        return createError(`Request to '${sourceId}' was refused. Scheme: ${util.inspect(access.scheme)}. Ident: ${util.inspect(access.ident)}`, 'noaccess')
      }

      const rawResponse = await this.retrieveRaw(request)
      const response = {...rawResponse, access}

      if (response.status === 'ok') {
        try {
          const normalized = await adapter.normalize(response.data, endpoint.path)
          response.data = normalized
        } catch (error) {
          return createError(`Error normalizing data from source '${sourceId}'. ${error}`)
        }
      }

      await invokeHooks(afterNormalize, response, this)

      return response
    },

    /**
     * Send raw data to source.
     * @param {Object} request - Request object
     * @returns {Object} Response object
     */
    async sendRaw (request) {
      await invokeHooks(beforeSend, request, this)

      let response
      try {
        response = await adapter.send(request)
      } catch (error) {
        response = createError(`Error sending to ${request.uri}. ${error}`)
      }

      await invokeHooks(afterSend, response, this)

      return response
    },

    /**
     * Serialize data and send to source.
     * @param {Object} request - Request object
     * @returns {Object} Response object
     */
    async send (request) {
      const {endpoint, access} = request
      if (!endpoint) {
        return createError(`No endpoint specified on request to source '${sourceId}'.`)
      }

      if (access.status === 'refused') {
        return createError(`Request to '${sourceId}' was refused. Scheme: ${util.inspect(access.scheme)}. Ident: ${util.inspect(access.ident)}`, 'noaccess')
      }

      await invokeHooks(beforeSerialize, request, this)

      let serialized
      try {
        serialized = await adapter.serialize(request.data, endpoint.path)
      } catch (error) {
        return createError(`Error serializing data for source '${sourceId}'. ${error}`)
      }
      return this.sendRaw({...request, data: serialized})
    }
  }
}

module.exports = source
