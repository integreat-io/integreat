const requestApi = require('request-promise-native')
const {get: getPath, set: setPath} = require('../../utils/path')
const createError = require('../../utils/createError')

const getAuthHeaders = (auth) => (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}

const handleError = async (request, response, noretry) => {
  const {uri, data, auth, method} = request
  const {statusCode} = response

  if (statusCode === 404) { // not found
    return createError(`Could not find the url ${uri}`, 'notfound')
  } else if (statusCode === 401) { // unauthorized
    if (noretry) {
      return createError('Not authorized', 'noaccess')
    } else if (!auth) {
      return createError('Source requires authentication', 'noaccess')
    } else if (await auth.authenticate()) {
      return json.send({uri, data, auth, method}, true)
    } else {
      return createError('Authentication failed', 'autherror')
    }
  } else {
    return createError(`Server returned ${response.statusCode} for ${uri}`)
  }
}

const json = {
  /**
   * Send the given data to the url, and return status and data.
   * This is used for both retrieving and sending data, and Integreat will
   * handle the preparation of the sent and the retrieved data.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before sending
   * the data with auth headers from the auth strategy.
   *
   * @param {Object} request - Request with uri, data, auth, method, and headers
   * @param {boolean} noretry - Will not retry authentication when true
   * @returns {Object} Object with status and data
   */
  async send (request, noretry = false) {
    const {uri, data, auth = null, method = 'PUT', headers = {}} = request

    if (auth && !auth.isAuthenticated() && !await auth.authenticate()) {
      return createError('Authentication failed', 'autherror')
    }

    let response
    try {
      response = await requestApi({
        uri,
        method,
        body: data,
        json: true,
        resolveWithFullResponse: true,
        simple: false,
        headers: {...headers, ...getAuthHeaders(auth)}
      })
    } catch (err) {
      return createError(`Server returned error for ${uri}: ${err}`)
    }

    const {statusCode} = response
    if (statusCode >= 200 && statusCode < 300) {  // ok
      return {status: 'ok', data: response.body}
    } else {
      return handleError(request, response, noretry)
    }
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
