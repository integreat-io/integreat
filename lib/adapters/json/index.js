const request = require('request-promise-native')
const {get: getPath, set: setPath} = require('../../utils/path')
const createError = require('../../utils/createError')

const authenticate = async (auth) => {
  if (auth && !auth.isAuthenticated()) {
    return await auth.authenticate()
  }
  return true
}

const getAuthHeaders = (auth) => (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}

const json = {
  /**
   * Retrieve the given endpoint and return as a object.
   * The returned object will be passed to the adapter's `normalize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before
   * retrieving the source with auth headers from the auth strategy.
   * @param {string} url - Url of endpoint to retrieve
   * @param {Object} auth - An auth strategy
   * @param {boolean} noretry - Will not retry authentication when true
   * @returns {Object} Source data as an object
   */
  async retrieve (url, auth, noretry = false) {
    if (!await authenticate(auth)) {
      return createError('Could not authenticate', 'autherror')
    }
    const headers = getAuthHeaders(auth)

    let response
    try {
      response = await request({
        url,
        json: true,
        resolveWithFullResponse: true,
        simple: false,
        headers
      })
    } catch (err) {
      return createError(`Server returned error for ${url}: ${err}`)
    }

    const status = response.statusCode
    if (status >= 200 && status < 300) { // ok
      return {status: 'ok', data: response.body}
    } else if (status === 404) { // not found
      return createError(`Could not find the url ${url}`, 'notfound')
    } else if (status === 401) { // unauthorized
      if (!noretry && auth && await auth.authenticate()) {
        return json.retrieve(url, auth, true)
      } else {
        return createError('Could not authorize', 'autherror')
      }
    } else {
      return createError(`Server returned ${response.statusCode} for ${url}`)
    }
  },

  /**
   * Send the given data to the url, and return status data.
   * The data object has been passed through the adapter's `serialize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before sending
   * the data with auth headers from the auth strategy.
   *
   * @param {string} url - Url of endpoint to send to
   * @param {Object} data - Data to send
   * @param {Object} auth - An auth strategy
   * @param {string} method - The method to use. Default is PUT
   * @param {boolean} noretry - Will not retry authentication when true
   * @returns {Object} Object with status and data
   */
  async send (url, data, auth = null, method = 'PUT', noretry = false) {
    if (!await authenticate(auth)) {
      return createError('Could not authenticate', 'autherror')
    }
    const headers = getAuthHeaders(auth)

    let response
    try {
      response = await request({
        url,
        method,
        body: data,
        json: true,
        resolveWithFullResponse: true,
        simple: false,
        headers
      })
    } catch (err) {
      return createError(`Server returned error for ${url}: ${err}`)
    }

    const status = response.statusCode
    if (status >= 200 && status < 300) {  // ok
      return {status: 'ok', data: response.body}
    } else if (status === 404) { // not found
      return createError(`Could not find the url ${url}`, 'notfound')
    } else if (status === 401) { // unauthorized
      if (!noretry && auth && await auth.authenticate()) {
        return json.send(url, data, auth, method, true)
      } else {
        return createError('Could not authorize', 'autherror')
      }
    } else {
      return createError(`Server returned ${response.statusCode} for ${url}`)
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
