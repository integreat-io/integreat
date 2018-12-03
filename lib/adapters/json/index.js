const { compile: compileUri, generate: generateUri } = require('great-uri-template')
const createError = require('../../utils/createError')
const sendToService = require('./sendToService')

const getMethod = (endpoint, data) => endpoint.method || ((data) ? 'PUT' : 'GET')

const json = {
  authentication: 'asHttpHeaders',

  async connect (serviceOptions, auth, connection) {
    return connection
  },

  async disconnect (connection) {
  },

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
    const options = { ...serviceOptions, ...endpointOptions }
    const { uri: uriTemplate, method = null, baseUri } = options

    if (!uriTemplate) {
      throw new TypeError('The uri prop is required')
    }

    const uri = compileUri((baseUri || '') + uriTemplate)

    return { ...options, uri, method }
  },

  /**
   * Send the given data to the url, and return status and data.
   * This is used for both retrieving and sending data, and Integreat will
   * handle the preparation of the sent and the retrieved data.
   *
   * If an auth object is provided, it is expected to be in the form of http
   * headers and added to the request's headers.
   *
   * @param {Object} request - Request with uri/endpoint, data, auth, method, and headers
   * @returns {Object} Object with status and data
   */
  async send (request) {
    const { endpoint, data, auth = null } = request

    if (!endpoint) {
      return createError('No endpoint specified in the request')
    }

    return sendToService({
      uri: generateUri(endpoint.uri, request.params),
      method: getMethod(endpoint, data),
      body: data,
      headers: endpoint.headers,
      auth
    })
  },

  /**
   * Normalize data from the service.
   * Returns the response unaltered for the json adapter.
   * @param {Object} response - Response with the data to normalize
   * @param {Object} request - The request
   * @returns {Object} Normalized data
   */
  async normalize (response, request) {
    return response
  },

  /**
   * Serialize data before sending to the service.
   * Returns the request unaltered for the json adapter.
   * @param {Object} data - The data to serialize
   * @param {Object} request - The request
   * @returns {Object} Serialized data
   */
  async serialize (request) {
    return request
  }
}

module.exports = json
