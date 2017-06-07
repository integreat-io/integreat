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

  const createItem = (params) => itemMapper(params)
  const itemMappers = items.map(createItem).reduce(reduceToObject('type'), {})

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
      const ret = {uri: null}
      const {uri: template} = endpoints[key] || {}
      if (template !== null && template !== undefined) {
        ret.uri = parseUriTemplate((baseUri || '') + template, params)
      }
      return ret
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
     * Retrieve data from source.
     * @param {string} uri - The endpoint url to fetch from
     * @returns {Object|Array} The retrieved data
     */
    async retrieve (uri) {
      return await adapter.retrieve(uri, auth)
    },

    /**
     * Send data to source.
     * @param {string} uri - The endpoint url to fetch from
     * @param {Object} data - The data to send
     * @returns {Object} Response object with status and data
     */
    async send (uri, data) {
      return await adapter.send(uri, data, auth)
    }
  }
}

module.exports = source
