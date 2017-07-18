const itemMapper = require('./itemMapper')
const parseUriTemplate = require('../../utils/parseUriTemplate')
const reduceToObject = require('../../utils/reduceToObject')

const joinPaths = (...paths) => paths.filter(
  (path) => typeof path === 'string' && path !== ''
).join('.') || null

const formatEndpoint = (value) => (typeof value === 'string') ? {uri: value} : value

/**
 * Create a source with the given id and adapter.
 * @param {Object} def - Object with adapter, endpoints, baseUri, mappings, and auth
 * @param {Object} resources - Object with transformers, filters, formatters, and types
 * @returns {Object} The created source
 */
function source (
  {
    id,
    adapter,
    auth = null,
    baseUri = null,
    endpoints = {},
    mappings = {}
  },
  {
    types = {},
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
    Object.assign(object, {[key]: formatEndpoint(endpoints[key])}), {})

  const itemMappers = Object.keys(mappings)
    .map((type) => [Object.assign({type}, mappings[type]), types[type]])
    .map(([mapping, type]) => itemMapper(mapping, {transformers, filters, formatters, type}))
    .reduce(reduceToObject('type'), {})

  return {
    id,
    adapter,

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
     * Normalize, map, and filter data from a source, through to the mapper
     * matching the given type. If none match, an asterisk mapper will be used
     * if present. Only data items with the given datatype will be included,
     * though.
     * @param {Object} data - The data to map
     * @param {string} type - Datatype
     * @param {string} path - Base path
     * @returns {Array} Array of mapped data objects
     */
    async mapFromSource (data, type, {path = null, mappedValuesOnly = false} = {}) {
      if (type && data) {
        const mapper = itemMappers[type] || itemMappers['*']
        if (mapper) {
          const items = await adapter.normalize(data, joinPaths(path, mapper.path))

          if (items && (!Array.isArray(items) || items.length > 0)) {
            return [].concat(items)
              .map((item) => mapper.fromSource(item, {mappedValuesOnly}))
              .filter((item) => (item.type === type) && mapper.filterFromSource(item))
          }
        }
      }
      return []
    },

    /**
     * Serialize, map, and filter data to a source, through the itemMapper
     * matching the data's type. Will assume data is an object.
     * @param {Object} data - The data object to map
     * @param {string} path - Base path
     * @returns {Object} Mapped data object
     */
    async mapToSource (data, path = null) {
      if (data && data.type) {
        const mapper = itemMappers[data.type] || itemMappers['*']
        if (mapper) {
          const item = mapper.toSource(data)

          if (mapper.filterToSource(item)) {
            return await adapter.serialize(item, joinPaths(path, mapper.path))
          }
        }
      }
      return null
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
        return {status: 'error', error: `Error retrieving from ${uri}. ${error}`}
      }
    },

    /**
     * Retrieve data from source.
     * @param {Object} args - Object with endpoint, params, and type
     * @returns {Array} Array of retrieved data
     */
    async retrieve ({endpoint, params, type, mappedValuesOnly = false}) {
      const {uri, path} = this.getEndpoint(endpoint, params) || {}
      if (!uri) {
        return {
          status: 'error',
          error: `Cannot retrieve from unknown endpoint '${endpoint}' on source '${id}'.`
        }
      }
      const ret = await this.retrieveRaw(uri)
      if (ret.status === 'ok') {
        try {
          const data = await this.mapFromSource(ret.data, type, {path, mappedValuesOnly})
          return Object.assign(ret, {data})
        } catch (error) {
          return {
            status: 'error',
            error: `Error mapping data from endpoint '${endpoint}' on source '${id}'. ${error}`
          }
        }
      }
      return ret
    },

    /**
     * Send raw data to source.
     * @param {string} uri - The uri to send to
     * @param {Object} data - The data to send
     * @returns {Object} Response object with status and data
     */
    async sendRaw (uri, data) {
      try {
        return await adapter.send(uri, data, auth)
      } catch (error) {
        return {status: 'error', error: `Error sending to ${uri}. ${error}`}
      }
    },

    /**
     * Send data to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async send ({endpoint, params = {}, data}) {
      const {uri, path} = this.getEndpoint(endpoint, params) || {}
      if (!uri) {
        return {
          status: 'error',
          error: `Cannot send to unknown endpoint ${endpoint} on source '${id}'.`
        }
      }
      let mappedData
      try {
        mappedData = await this.mapToSource(data, path)
      } catch (error) {
        return {
          status: 'error',
          error: `Error mapping data from endpoint '${endpoint}' on source '${id}'. ${error}`
        }
      }
      return await this.sendRaw(uri, mappedData)
    }
  }
}

module.exports = source
