const got = require('got')
const {compile: compileUri, generate: generateUri} = require('great-uri-template')
const {compile: compilePath, get: getPath, set: setPath} = require('../../utils/path')
const createError = require('../../utils/createError')

const getAuthHeaders = (auth) => (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}

const handleUnauthorized = (request, error, forceAuth) => {
  const {uri, data, auth, method} = request

  if (forceAuth) {
    // Will not force a second time
    return createError('Not authorized', 'noaccess')
  } else if (!auth) {
    // No auth is proviced
    return createError('Source requires authentication', 'noaccess')
  } else {
    // Try again and force auth - old auth is probably outdated
    return json.send({uri, data, auth, method}, true)
  }
}

const handleError = async (request, error, forceAuth) => {
  const {uri} = request
  const {statusCode} = error

  if (statusCode === undefined) {
    // No http error
    return createError(`Server returned '${error}' for ${uri}`)
  } else if (statusCode === 404) {
    // Not found
    return createError(`Could not find the url ${uri}`, 'notfound')
  } else if (statusCode === 401) {
    // Unauthorized
    return handleUnauthorized(request, error, forceAuth)
  } else {
    // Other errors
    return createError(`Server returned ${statusCode} for ${uri}`)
  }
}

const prepareBodyArray = (body) => body.map((prop) =>
  ({...prop, path: compilePath(prop.path)}))

const json = {
  /**
   * Prepare endpoint options for later use by the adapter.
   * The endpoint options are only used by the adapter.
   * Might also be given source options, which are also adapter specific.
   *
   * @param {Object} endpointOptions - The endpoint options to prepare
   * @param {Object} sourceOptions - Source options
   * @returns {Object} The prepared endpoint
   */
  prepareEndpoint (endpointOptions, sourceOptions = {}) {
    const {uri: uriTemplate, path: pathString, method = null, body: bodyArray} = endpointOptions
    const {baseUri} = sourceOptions

    if (!uriTemplate) {
      throw new TypeError('The uri prop is required')
    }

    const uri = compileUri((baseUri || '') + uriTemplate)
    const path = compilePath(pathString)
    const body = (bodyArray) ? prepareBodyArray(bodyArray) : null

    return {uri, method, path, body}
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
   * @param {boolean} forceAuth - Will force authentication
   * @returns {Object} Object with status and data
   */
  async send (request, forceAuth = false) {
    const {endpoint, data, auth = null, headers = {}} = request
    const method = request.method || ((data) ? 'PUT' : 'GET')

    if (!request.uri && !endpoint) {
      return createError('No uri or endpoint specified in the request')
    }

    const uri = request.uri || generateUri(endpoint.uri, request.params)

    let body = data
    if (endpoint && Array.isArray(endpoint.body)) {
      body = endpoint.body.reduce((body, prop) =>
        setPath(body, prop.path, request.params[prop.param]), {...data})
    }

    if (auth && (forceAuth || !auth.isAuthenticated()) && !await auth.authenticate()) {
      return createError('Authentication failed', 'autherror')
    }

    let response
    try {
      response = await got(uri, {
        method,
        json: true,
        body,
        headers: {...headers, ...getAuthHeaders(auth)}
      })
    } catch (err) {
      return handleError(request, err, forceAuth)
    }

    return {status: 'ok', data: response.body}
  },

  /**
   * Normalize data from the source.
   * Returns an object starting from the given path.
   * @param {Object} data - The data to normalize
   * @param {array} path - The compiled path to start from
   * @returns {Object} Normalized data
   */
  async normalize (data, path = null) {
    if (path === null || path === '') {
      return data
    }

    return getPath(data, path, null)
  },

  /**
   * Serialize data before sending to the source.
   * Will set the given data as a property according to the path, if specified.
   * @param {Object} data - The data to serialize
   * @param {array} path - The compiled path to start from
   * @returns {Object} Serialized data
   */
  async serialize (data, path = null) {
    if (path === null || path === '') {
      return data
    }

    return setPath({}, path, data)
  }
}

module.exports = json
