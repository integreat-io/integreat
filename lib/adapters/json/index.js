const dotProp = require('dot-prop')
const request = require('request-promise-native')

const authAndGetHeaders = async (auth) => {
  if (auth && !auth.isAuthenticated()) {
    const authOk = await auth.authenticate()
    if (!authOk) {
      throw new Error('Could not authenticate')
    }
  }
  return (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}
}

const json = {
  /**
   * Retrieve the given endpoint and return as a object.
   * The returned object will be passed to the adapter's `normalize` method.
   *
   * If an auth strategy is provided, authorization is attempted if not already
   * authenticated, and a successfull authentication is required before retrieving
   * the source with auth headers from the auth strategy.
   *
   * @param {string} url - Url of endpoint to retrieve
   * @param {Object} auth - An auth strategy
   * @returns {Object} Source data as an object
   */
  async retrieve (url, auth) {
    const headers = await authAndGetHeaders(auth)

    const response = await request({
      url,
      json: true,
      resolveWithFullResponse: true,
      simple: false,
      headers
    })

    if (response.statusCode !== 200) {
      throw new Error(`Server returned ${response.statusCode} for ${url}`)
    }

    return response.body
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
   * @returns {Object} Object with status and data
   */
  async send (url, data, auth = null, method = 'PUT') {
    const headers = await authAndGetHeaders(auth)

    const response = await request({
      url,
      method,
      body: data,
      json: true,
      resolveWithFullResponse: true,
      simple: false,
      headers
    })

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Server returned ${response.statusCode} for ${url}`)
    }

    return {
      status: response.statusCode,
      data: response.body
    }
  },

  /**
   * Normalize data from the source.
   * Returns an object starting from the given path.
   * @param {Object} data - The data to normalize
   * @param {string} path - The path to start from
   * @returns {Object} Normalized data
   */
  async normalize (data, path = null) {
    if (path === null || path === '') {
      return data
    }

    return dotProp.get(data, path)
  },

  /**
   * Serialize data before sending to the source.
   * Will set the given data as a property according to the path, if specified.
   * @param {Object} data - The data to serialize
   * @param {string} path - The path to start from
   * @returns {Object} Serialized data
   */
  async serialize (data, path = null) {
    if (path === null || path === '') {
      return data
    }

    const obj = {}
    dotProp.set(obj, path, data)
    return obj
  }
}

module.exports = json
