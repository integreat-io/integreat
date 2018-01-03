const itemMapper = require('./itemMapper')
const reduceToObject = require('../../utils/reduceToObject')
const createError = require('../../utils/createError')
const compareEndpoints = require('../../utils/compareEndpoints')
const getEndpoint = require('../../utils/getEndpoint')

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

const prepareParams = ({action, type, id, method, params, data = {}}) => ({
  action,
  type: type || data.type,
  id: id || data.id,
  method,
  ...params
})

/**
 * Create a source with the given id and adapter.
 * @param {Object} def - Object with adapter, endpoints, baseUri, mappings, and auth
 * @param {Object} resources - Object with transformers, filters, formatters, and datatypes
 * @returns {Object} The created source
 */
function source (
  {
    id: sourceId,
    adapter,
    auth = null,
    handleMeta = false,
    baseUri = null,
    endpoints = [],
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
  if (!sourceId) {
    throw new TypeError(`Can't create source without an id.`)
  }
  adapter = lookup(adapter, adapters)
  if (!adapter) {
    throw new TypeError(`Can't create source '${sourceId}' without an adapter.`)
  }

  auth = lookup(auth, auths)

  beforeRetrieve = lookupHooks(beforeRetrieve, hooks)
  afterRetrieve = lookupHooks(afterRetrieve, hooks)
  afterNormalize = lookupHooks(afterNormalize, hooks)
  beforeSerialize = lookupHooks(beforeSerialize, hooks)
  beforeSend = lookupHooks(beforeSend, hooks)
  afterSend = lookupHooks(afterSend, hooks)

  endpoints = endpoints
    .map((endpoint) => ({
      ...endpoint,
      options: adapter.prepareEndpoint(endpoint.options, {baseUri})
    }), {})
    .sort(compareEndpoints)

  const hasMetaMapping = () => mappings.hasOwnProperty('meta') || mappings.hasOwnProperty('*')
  if (handleMeta === true && !hasMetaMapping()) {
    mappings.meta = {}
  }

  const itemMappers = Object.keys(mappings)
    .map((type) => Object.assign({type}, mappings[type]))
    .map((mapping) => itemMapper(mapping, {transformers, filters, formatters, datatype: datatypes[mapping.type]}))
    .reduce(reduceToObject('type'), {})

  return {
    id: sourceId,
    adapter,
    handleMeta,

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
      // Complete request object
      request = {headers: {}, method: 'GET', ...request, auth}

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
     * @param {Object} args - Object with endpoint and params
     * @returns {Object} The retrieved data
     */
    async retrieveNormalized (request) {
      const endpoint = getEndpoint(endpoints, request)
      if (!endpoint) {
        return createError(`No endpoint matches the request on source '${sourceId}'`)
      }

      const {options} = endpoint
      request = {
        ...request,
        endpoint: options,
        method: options.method || request.method || 'GET'
      }
      request.params = prepareParams(request)

      let response = await this.retrieveRaw(request)

      if (response.status === 'ok') {
        try {
          const normalized = await adapter.normalize(response.data, options.path)
          response = {...response, data: normalized}
        } catch (error) {
          return createError(`Error normalizing data from source '${sourceId}'. ${error}`)
        }
      }

      await invokeHooks(afterNormalize, response, this)

      return response
    },

    /**
     * Retrieve data from source.
     * @param {Object} request - Object with endpoint, params, type, etc.
     * @param {Object} options - Object with useDefaults
     * @returns {Array} Array of retrieved data
     */
    async retrieve (request, {useDefaults = false} = {}) {
      const {params = {}, type} = request
      const types = [].concat(type)
      if (!type || types.length === 0) {
        return {status: 'ok', data: []}
      }

      const ret = await this.retrieveNormalized(request)

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
      // Complete request object
      request = {headers: {}, source: sourceId, ...request, auth}

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
     * @param {Object} args - Object with endpoint, params, and data
     * @returns {Object} Response object with status and data
     */
    async sendSerialized (request) {
      const endpoint = getEndpoint(endpoints, request)
      if (!endpoint) {
        return createError(`No endpoint matches the request on source '${sourceId}'.`)
      }

      const {options} = endpoint
      request = {
        ...request,
        endpoint: options,
        method: options.method || request.method || 'PUT'
      }
      request.params = prepareParams(request)

      await invokeHooks(beforeSerialize, request, this)

      let serialized
      try {
        serialized = await adapter.serialize(request.data, options.path)
      } catch (error) {
        return createError(`Error serializing data for source '${sourceId}'. ${error}`)
      }
      return this.sendRaw({...request, data: serialized})
    },

    /**
     * Send data to source.
     * @param {Object} request - Object with endpoint, params, data, etc.
     * @param {Object} options - Object with useDefaults
     * @returns {Object} Response object with status and data
     */
    async send (request, {useDefaults = false} = {}) {
      const data = await this.mapToSource(request.data, {useDefaults})

      return this.sendSerialized({...request, data})
    }
  }
}

module.exports = source
