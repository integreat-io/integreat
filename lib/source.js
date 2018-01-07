const reduceToObject = require('./utils/reduceToObject')
const createError = require('./utils/createError')
const compareEndpoints = require('./utils/compareEndpoints')
const getEndpoint = require('./utils/getEndpoint')

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
 * @param {Object} resources - Object with datatypes, mappings, adapters, auths, and hooks
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
    beforeRetrieve,
    afterRetrieve,
    afterNormalize,
    beforeSerialize,
    beforeSend,
    afterSend
  },
  {
    datatypes = {},
    mappings = [],
    adapters = {},
    auths = {},
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

  mappings = mappings
    .filter((mapping) => [].concat(mapping.source).includes(sourceId))
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
        ret.data = (await Promise.all(
          types.map((type) => mappings[type] && mappings[type].fromSource(ret.data, {params, useDefaults}))
        ))
          .reduce(flatten, [])
          .filter((item) => item !== undefined)
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
      const data = [].concat(request.data)
        .map((item) => mappings[item.type] && mappings[item.type].toSource(item, {useDefaults}))
        .filter((item) => item !== undefined)

      return this.sendSerialized({
        ...request,
        data: (Array.isArray(request.data)) ? data : (data[0])
      })
    }
  }
}

module.exports = source
