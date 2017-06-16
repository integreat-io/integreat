const itemMapper = require('./itemMapper')
const parseUriTemplate = require('../../utils/parseUriTemplate')
const reduceToObject = require('../../utils/reduceToObject')

const joinPaths = (...paths) => paths.filter((path) => typeof path === 'string' && path !== '').join('.')

/**
 * Create a source with the given id and adapter.
 * @param {string} id - The id for this source
 * @param {Object} params - Object with params adapter, endpoints, baseUri, items, and auth
 * @returns {Object} The created source
 */
function source (id, {adapter, auth = null, baseUri = null, endpoints = {}, items = []} = {}) {
  if (!adapter) {
    throw new TypeError(`Can't create source '${id}' without an adapter.`)
  }

  const itemMappers = items.map(itemMapper).reduce(reduceToObject('type'), {})

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
     * Normalize, map, and filter data from a source, throught to the itemMapper
     * matching the given type. Will always return array of data.
     * @param {Object} data - The data to map
     * @param {string} type - Item type
     * @param {string} path - Base path
     * @returns {Array} Array of mapped data objects
     */
    async mapFromSource (data, type, path = null) {
      if (!type || !data) {
        return []
      }
      const itemMapper = itemMappers[type]
      const items = await adapter.normalize(data, joinPaths(path, itemMapper.path))
      return [].concat(items || [])
        .map((item) => itemMapper.fromSource(item))
        .filter((item) => itemMapper.filterFromSource(item))
    },

    /**
     * Serialize, map, and filter data to a source, through the itemMapper
     * matching the data's type. Will assume data is an object.
     * @param {Object} data - The data object to map
     * @param {string} path - Base path
     * @returns {Object} Mapped data object
     */
    async mapToSource (data, path = null) {
      if (data) {
        const itemMapper = itemMappers[data.type]
        if (itemMapper) {
          const item = itemMapper.toSource(data)
          if (itemMapper.filterToSource(item)) {
            return await adapter.serialize(item, joinPaths(path, itemMapper.path))
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
      return await adapter.retrieve(uri, auth)
    },

    /**
     * Retrieve data from source.
     * @param {Object} args - Object with endpoint, params, and type
     * @returns {Array} Array of retrieved data
     */
    async retrieve ({endpoint, params = {}, type} = {}) {
      const {uri, path} = this.getEndpoint(endpoint, params) || {}
      if (!uri) {
        throw new TypeError(`Cannot retrieve from unknown endpoint ${endpoint}.`)
      }
      const data = await this.retrieveRaw(uri)
      return await this.mapFromSource(data, type, path)
    },

    /**
     * Send raw data to source.
     * @param {string} uri - The uri to send to
     * @param {Object} data - The data to send
     * @returns {Object} Response object with status and data
     */
    async sendRaw (uri, data) {
      return await adapter.send(uri, data, auth)
    },

    /**
     * Send data to source.
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async send ({endpoint, params = {}, data}) {
      const {uri, path} = this.getEndpoint(endpoint, params) || {}
      if (!uri) {
        throw new TypeError(`Cannot send to unknown endpoint ${endpoint}.`)
      }
      const mappedData = await this.mapToSource(data, path)
      return await this.sendRaw(uri, mappedData)
    }
  }
}

module.exports = source
