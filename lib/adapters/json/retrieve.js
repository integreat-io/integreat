const request = require('request')

// Run the request
const runRequest = (endpoint, auth) => {
  return new Promise((resolve, reject) => {
    const options = {
      url: endpoint,
      json: true,
      headers: (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}
    }

    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      } else if (response.statusCode !== 200) {
        reject(new Error(`Server returned ${response.statusCode} for ${endpoint}`))
      } else {
        resolve(body)
      }
    })
  })
}

/**
 * Retrieve the given endpoint and return as a object.
 * The returned object will be passed to the adapter's `normalize` method.
 *
 * If an auth strategy is provided, authorization is attempted if not already
 * authenticated, and a successfull authentication is required before retrieving
 * the source with auth headers from the auth strategy.
 *
 * @param {string} endpoint - Url of endpoint to retrieve
 * @param {Object} auth - An auth strategy
 * @returns {Object} Source data as an object
 */
module.exports = function retrieve (endpoint, auth) {
  if (auth && !auth.isAuthenticated()) {
    return auth.authenticate()
      .then((authenticated) => {
        if (!authenticated) {
          return Promise.reject(new Error('Could not authenticate'))
        }
        return runRequest(endpoint, auth)
      })
  } else {
    return runRequest(endpoint, auth)
  }
}
