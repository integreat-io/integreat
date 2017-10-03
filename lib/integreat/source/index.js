const {compile: compileUri, generate: generateUri} = require('great-uri-template')
const itemMapper = require('./itemMapper')
const reduceToObject = require('../../utils/reduceToObject')
const createError = require('../../utils/createError')
const {compile: compilePath} = require('../../utils/path')

const flatten = (sup, sub) => sup.concat(sub)

const prepareEndpoint = (endpoint, baseUri) => (typeof endpoint === 'string')
  ? {uri: compileUri((baseUri || '') + endpoint)}
  : Object.assign({}, endpoint, {
    uri: compileUri((baseUri || '') + endpoint.uri),
    path: compilePath(endpoint.path)
  })

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
 * @param {Object} def - Object with adapter, endpoints, baseUri, mappings, and auth
 * @param {Object} resources - Object with transformers, filters, formatters, and datatypes
 * @returns {Object} The created source
 */
function source (
  {
    id,
    adapter,
    auth = null,
    handleMeta = false,
    baseUri = null,
    endpoints = {},
    mappings = {},
    beforeRetrieve,
    afterRetrieve,
    afterNormalize,
    beforeSerialize,
    beforeSend,
    afterSend
  },
  {
    datatypes = {},
    adapters = {},
    auths = {},
    transformers = {},
    filters = {},
    formatters = {},
    hooks = {}
  } = {}
) {
  if (!id) {
    throw new TypeError(`Can't create source without an id.`)
  }
  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create source '${id}' without an adapter.`)
  }

  auth = lookup(auth, auths)

  beforeRetrieve = lookupHooks(beforeRetrieve, hooks)
  afterRetrieve = lookupHooks(afterRetrieve, hooks)
  afterNormalize = lookupHooks(afterNormalize, hooks)
  beforeSerialize = lookupHooks(beforeSerialize, hooks)
  beforeSend = lookupHooks(beforeSend, hooks)
  afterSend = lookupHooks(afterSend, hooks)

  endpoints = Object.keys(endpoints).reduce((object, key) =>
    Object.assign(object, {[key]: prepareEndpoint(endpoints[key], baseUri)}), {})

  const hasMetaMapping = () => mappings.hasOwnProperty('meta') || mappings.hasOwnProperty('*')
  if (handleMeta === true && !hasMetaMapping()) {
    mappings.meta = {}
  }

  const itemMappers = Object.keys(mappings)
    .map((type) => Object.assign({type}, mappings[type]))
    .map((mapping) => itemMapper(mapping, {transformers, filters, formatters, datatype: datatypes[mapping.type]}))
    .reduce(reduceToObject('type'), {})

  return {
    id,
    adapter,
    handleMeta,

    /**
     * Get the endpoint with the given key and expand it with the given params.
     * Endpoints are expanded as uri templates.
     * @param {Object} key - The key for the uri template endpoint
     * @param {Object} params - Object with key and value for the expansion
     * @returns {string} Endpoint uri
     */
    getEndpoint (key, params) {
      let ret = endpoints[key]
      if (ret && ret.uri) {
        return Object.assign({}, ret, {uri: generateUri(ret.uri, params)})
      }
      return ret || null
    },

    /**
     * Map, and filter data from a source, through to the mapper matching the
     * given type. If none match, an asterisk mapper will be used if present.
     * Only data items with the given datatype will be included.
     * @param {Object} data - The data to map
     * @param {string} type - Datatype
     * @returns {Array} Array of mapped data objects
     */
    async mapFromSource (items, type, {params = {}, useDefaults = false} = {}) {
      if (items && type) {
        const mapper = itemMappers[type] || itemMappers['*']
        if (mapper) {
          const datatype = (mapper.type === '*') ? datatypes[type] : null
          return [].concat(mapper.fromSource(items, {params, datatype, useDefaults}))
            .filter((item) => item !== null)
        }
      }
      return []
    },

    /**
     * Map, and filter data to a source, through the itemMapper matching the
     * data's type. Returns data as object or array, depending on what it gets.
     * @param {Object|Object[]} data - The data object to map
     * @returns {Object} Mapped data object
     */
    async mapToSource (data, {useDefaults = false} = {}) {
      const mapOne = (data) => {
        const {type} = data || {}
        if (type) {
          const mapper = itemMappers[type] || itemMappers['*']
          if (mapper) {
            const datatype = (mapper.type === '*') ? datatypes[type] : null
            return mapper.toSource(data, {datatype, useDefaults})
          }
        }
        return null
      }

      return (Array.isArray(data))
        ? data.map(mapOne).filter((item) => item !== null)
        : mapOne(data)
    },

    /**
     * Retrieve raw data from source
     * @param {Object} request - Request object with uri to fetch from
     * @returns {Object} The retrieved data
     */
    async retrieveRaw (request) {
      // Make sure request has headers object
      request = Object.assign({headers: {}}, request)

      await invokeHooks(beforeRetrieve, request, this)

      let response
      try {
        response = await adapter.retrieve(Object.assign({auth}, request))
      } catch (error) {
        response = createError(`Error retrieving from ${request.uri}. ${error}`)
      }

      await invokeHooks(afterRetrieve, response, this)

      return response
    },

    /**
     * Retrieve data from source and normalize it
     * @param {Object} args - Object with endpoint and params
     * @returns {Object} The retrieved data
     */
    async retrieveNormalized ({endpoint: endpointId, params = {}}) {
      let endpoint
      try {
        endpoint = this.getEndpoint(endpointId, params) || {}
      } catch (error) {
        return createError(`Cannot retrieve from endpoint '${endpointId}' on source '${id}'. ${error}`)
      }

      const {uri, path} = endpoint
      if (!uri) {
        return createError(`Cannot retrieve from unknown endpoint '${endpointId}' on source '${id}'.`)
      }

      let response = await this.retrieveRaw({uri})

      if (response.status === 'ok') {
        try {
          const data = await adapter.normalize(response.data, path)
          response = Object.assign({}, response, {data})
        } catch (error) {
          return createError(`Error normalizing data from '${endpoint}' on source '${id}'. ${error}`)
        }
      }

      await invokeHooks(afterNormalize, response, this)

      return response
    },

    /**
     * Retrieve data from source.
     * @param {Object} args - Object with endpoint, params, and type
     * @returns {Array} Array of retrieved data
     */
    async retrieve ({endpoint, params = {}, type, useDefaults = false}) {
      const types = [].concat(type)
      if (!type || types.length === 0) {
        return {status: 'ok', data: []}
      }

      const ret = await this.retrieveNormalized({endpoint, params})

      if (ret.status === 'ok') {
        const source = this
        const itemsForTypes = await Promise.all(
          types.map((type) => source.mapFromSource(ret.data, type, {params, useDefaults}))
        )
        ret.data = itemsForTypes.reduce(flatten, [])
      }

      return ret
    },

    /**
     * Send raw data to source.
     * @param {Object} request - A request object with uri, method, and data
     * @param {Object} data - The data to send
     * @param {string} method - The method to send with
     * @returns {Object} Response object with status and data
     */
    async sendRaw (request) {
      // Make sure request has a headers object
      request = Object.assign({headers: {}}, request)

      await invokeHooks(beforeSend, request, this)

      let response
      try {
        response = await adapter.send(Object.assign({auth}, request))
      } catch (error) {
        response = createError(`Error sending to ${request.uri}. ${error}`)
      }

      await invokeHooks(afterSend, response, this)

      return response
    },

    /**
     * Serialize data and send to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async sendSerialized ({endpoint, params = {}, data, method = 'PUT'}) {
      let request = {data, method}
      try {
        Object.assign(request, this.getEndpoint(endpoint, params) || {})
      } catch (error) {
        return createError(`Cannot send to endpoint ${endpoint} on source '${id}'. ${error}`)
      }

      if (!request.uri) {
        return createError(`Cannot send to unknown endpoint ${endpoint} on source '${id}'.`)
      }

      await invokeHooks(beforeSerialize, request, this)

      try {
        const data = await adapter.serialize(request.data, request.path)
        request = Object.assign({}, request, {data})
      } catch (error) {
        return createError(`Error serializing data for endpoint '${endpoint}' on source '${id}'. ${error}`)
      }
      return this.sendRaw(request)
    },

    /**
     * Send data to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async send ({endpoint, params = {}, data, useDefaults = false, method}) {
      data = await this.mapToSource(data, {useDefaults})

      return this.sendSerialized({endpoint, params, data, method})
    }
  }
}

module.exports = source
