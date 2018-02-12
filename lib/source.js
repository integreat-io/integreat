const util = require('util')
const reduceToObject = require('./utils/reduceToObject')
const createError = require('./utils/createError')
const compareEndpoints = require('./utils/compareEndpoints')
const getEndpoint = require('./utils/getEndpoint')
const authorizeRequest = require('./utils/authorize/request')
const authorizeItem = require('./utils/authorize/item')

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
  endpoints = endpoints
    .map((endpoint) => ({
      ...endpoint,
      options: adapter.prepareEndpoint(endpoint.options, {baseUri})
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
     * @param {Object} response - The response object to map and cast
     * @param {Object} options - type, params, useDefaults
     * @returns {Object[]} Always returns an array of data objects
     */
    mapFromSource (response, {type, params = {}, useDefaults = false, requireAuth, method}) {
      const {data, access = {}} = response
      if (!type || !data) {
        return {data: []}
      }

      const mapWithType = (type) => (mappings[type])
        ? mappings[type].fromSource(data, params, {useDefaults}) : []

      const mappedData = [].concat(type)
        .map((type) => mapWithType(type))
        .reduce(flatten, [])

      const authenticatedData = mappedData.filter((item) => {
        const {status} = authorizeItem(item, access, {datatypes, requireAuth, method})
        return status === 'granted'
      })

      const status = (mappedData.length === authenticatedData.length)
        ? 'granted' : (authenticatedData.length === 0) ? 'refused' : 'partially'

      return {
        ...response,
        data: authenticatedData,
        access: {status, ident: access.ident},
        status: (status === 'refused') ? 'noaccess' : response.status
      }
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
     * Will complete the given request object with endpoint and params.
     *
     * @param {Object} request - The request object to complete
     * @returns {Object} The completed request
     */
    prepareRequest (request) {
      const {action, type, headers = {}, uri, params = {}, ident = {}} = request
      const {options: endpoint} = getEndpoint(endpoints, request) || {}
      const typePlural = (datatypes[type] && datatypes[type].plural) || (type && `${type}s`)
      const method = (endpoint && endpoint.method) || request.method

      return {
        action,
        method,
        type,
        data: request.data,
        endpoint,
        uri,
        params: {
          type,
          typePlural,
          ident: ident && ident.id,
          ...params
        },
        headers,
        auth: request.auth || auth,
        ident
      }
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
      const {endpoint} = request
      if (!endpoint) {
        return createError(`No endpoint specified on request to source '${sourceId}'.`)
      }

      const access = authorizeRequest(request, datatypes)
      if (access.status === 'refused') {
        return createError(`Request to '${sourceId}' was refused. Scheme: ${util.inspect(access.scheme)}`, 'noaccess')
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
      const {endpoint} = request
      if (!endpoint) {
        return createError(`No endpoint specified on request to source '${sourceId}'.`)
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
