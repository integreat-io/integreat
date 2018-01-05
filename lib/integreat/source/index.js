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
    endpoints,

    /**
     * Will complete the given request object with endpoint and params.
     *
     * @param {Object} request - The request object to complete
     * @returns {Object} The completed request
     */
    prepareRequest (request) {
      const {action, data = {}, headers = {}, uri} = request
      const id = request.id || data.id
      const type = request.type || data.type
      const {options: endpoint} = getEndpoint(endpoints, request) || {}
      const datatype = datatypes[type] || {}
      const method = (endpoint && endpoint.method) || request.method

      const params = {
        $action: action,
        $method: method,
        $source: sourceId,
        id: id,
        type,
        typePlural: datatype.plural || (type && `${type}s`),
        ...request.params
      }

      return {
        action,
        method,
        id,
        type,
        data: request.data,
        endpoint,
        uri,
        params,
        headers,
        auth: request.auth || auth
      }
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
    async retrieveNormalized (request) {
      const {endpoint} = request
      if (!endpoint) {
        return createError(`No endpoint specified on request to source '${sourceId}'.`)
      }

      let response = await this.retrieveRaw(request)

      if (response.status === 'ok') {
        try {
          const normalized = await adapter.normalize(response.data, endpoint.path)
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
     * @param {Object} request - Request object
     * @param {Object} options - Object with useDefaults
     * @returns {Object} Response object
     */
    async retrieve (request, {useDefaults = false} = {}) {
      const {params, type} = request
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
    async sendSerialized (request) {
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
    },

    /**
     * Send data to source.
     * @param {Object} request - Request object
     * @param {Object} options - Object with useDefaults
     * @returns {Object} Response object
     */
    async send (request, {useDefaults = false} = {}) {
      const data = await this.mapToSource(request.data, {useDefaults})

      return this.sendSerialized({...request, data})
    }
  }
}

module.exports = source
