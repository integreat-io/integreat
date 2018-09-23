const { compile: compileUri, generate: generateUri } = require('great-uri-template')
const { compile: compilePath, get: getPath, set: setPath } = require('./path')
const createError = require('../../utils/createError')
const sendToService = require('./sendToService')

const prepareBodyArray = (body) =>
  body.map((prop) => ({ ...prop, path: compilePath(prop.path) }))

const prepareBody = (request) => {
  const { endpoint, data, params } = request

  if (endpoint && Array.isArray(endpoint.body)) {
    return endpoint.body.reduce((body, prop) =>
      setPath(body, prop.path, params[prop.param]), { ...data })
  }

  return data
}

const getMethod = (endpoint, data) => endpoint.method || ((data) ? 'PUT' : 'GET')

const json = {
  /**
   * Prepare endpoint options for later use by the adapter.
   * The endpoint options are only used by the adapter.
   * Might also be given service options, which are also adapter specific.
   *
   * @param {Object} endpointOptions - The endpoint options to prepare
   * @param {Object} serviceOptions - Service options
   * @returns {Object} The prepared endpoint
   */
  prepareEndpoint (endpointOptions, serviceOptions = {}) {
    const { uri: uriTemplate, path: pathString, method = null, body: bodyArray, headers = {} } = endpointOptions
    const { baseUri } = serviceOptions

    if (!uriTemplate) {
      throw new TypeError('The uri prop is required')
    }

    const uri = compileUri((baseUri || '') + uriTemplate)
    const path = compilePath(pathString)
    const body = (bodyArray) ? prepareBodyArray(bodyArray) : null

    return { uri, method, path, body, headers }
  },

  /**
   * Send the given data to the url, and return status and data.
   * This is used for both retrieving and sending data, and Integreat will
   * handle the preparation of the sent and the retrieved data.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before sending
   * the data with auth headers from the auth strategy.
   *
   * @param {Object} request - Request with uri/endpoint, data, auth, method, and headers
   * @returns {Object} Object with status and data
   */
  async send (request) {
    const { endpoint, data, auth = null } = request

    if (!endpoint) {
      return createError('No endpoint specified in the request')
    }

    const method = getMethod(endpoint, data)
    const uri = generateUri(endpoint.uri, request.params)
    const body = prepareBody(request)
    const headers = endpoint.headers || {}

    return sendToService({ uri, method, body, headers, auth })
  },

  /**
   * Normalize data from the service.
   * Returns an object starting from the path set on the request endpoint.
   * @param {Object} data - The data to normalize
   * @param {Object} request - The request
   * @returns {Object} Normalized data
   */
  async normalize (data, { endpoint = {} }) {
    const { path } = endpoint
    if (path === null || path === '') {
      return data
    }

    return getPath(data, path, null)
  },

  /**
   * Serialize data before sending to the service.
   * Will set the given data as a property according to the path set on the
   * request endpoint, if specified.
   * @param {Object} data - The data to serialize
   * @param {Object} request - The request
   * @returns {Object} Serialized data
   */
  async serialize (data, { endpoint = {} }) {
    const { path } = endpoint
    if (path === null || path === '') {
      return data
    }

    return setPath({}, path, data)
  }
}

module.exports = json
