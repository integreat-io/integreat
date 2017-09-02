const itemMapper = require('./itemMapper')
const parseUriTemplate = require('../../utils/parseUriTemplate')
const reduceToObject = require('../../utils/reduceToObject')
const createError = require('../../utils/createError')
const {compile: compilePath} = require('../../utils/path')

const flatten = (sup, sub) => sup.concat(sub)

const prepareEndpoint = (value) => (typeof value === 'string')
  ? {uri: value}
  : Object.assign({}, value, {path: compilePath(value.path)})

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
    mappings = {}
  },
  {
    datatypes = {},
    adapters = {},
    auths = {},
    transformers,
    filters,
    formatters
  } = {}
) {
  if (typeof adapter === 'string') {
    adapter = adapters[adapter]
  }
  if (!adapter) {
    throw new TypeError(`Can't create source '${id}' without an adapter.`)
  }

  if (typeof auth === 'string') {
    auth = auths[auth]
  }

  endpoints = Object.keys(endpoints).reduce((object, key) =>
    Object.assign(object, {[key]: prepareEndpoint(endpoints[key])}), {})

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
        return Object.assign({}, ret, {uri: parseUriTemplate((baseUri || '') + ret.uri, params)})
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

      return (Array.isArray(data)) ? data.map(mapOne) : mapOne(data)
    },

    /**
     * Retrieve raw data from source
     * @param {string} uri - The uri to fetch from
     * @returns {Object} The retrieved data
     */
    async retrieveRaw (uri) {
      try {
        return await adapter.retrieve(uri, auth)
      } catch (error) {
        return createError(`Error retrieving from ${uri}. ${error}`)
      }
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

      const ret = await this.retrieveRaw(uri)

      if (ret.status === 'ok') {
        try {
          const data = await adapter.normalize(ret.data, path)
          return Object.assign({}, ret, {data})
        } catch (error) {
          return createError(`Error normalizing data from '${endpoint}' on source '${id}'. ${error}`)
        }
      }

      return ret
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
     * @param {string} uri - The uri to send to
     * @param {Object} data - The data to send
     * @param {string} method - The method to send with
     * @returns {Object} Response object with status and data
     */
    async sendRaw (uri, data, method) {
      try {
        return await adapter.send(uri, data, auth, method)
      } catch (error) {
        return createError(`Error sending to ${uri}. ${error}`)
      }
    },

    /**
     * Serialize data and send to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async sendSerialized ({endpoint: endpointId, params = {}, data}) {
      let endpoint
      try {
        endpoint = this.getEndpoint(endpointId, params) || {}
      } catch (error) {
        return createError(`Cannot send to enpoint ${endpointId} on source '${id}'. ${error}`)
      }

      const {uri, path, method} = endpoint
      if (!uri) {
        return createError(`Cannot send to unknown endpoint ${endpointId} on source '${id}'.`)
      }

      try {
        data = await adapter.serialize(data, path)
        return this.sendRaw(uri, data, method)
      } catch (error) {
        return createError(`Error mapping data from endpoint '${endpointId}' on source '${id}'. ${error}`)
      }
    },

    /**
     * Send data to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async send ({endpoint, params = {}, data, useDefaults = false}) {
      data = await this.mapToSource(data, {useDefaults})
      return this.sendSerialized({endpoint, params, data})
    }
  }
}

module.exports = source
