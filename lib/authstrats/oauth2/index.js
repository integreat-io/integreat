const authenticate = require('./authenticate')
const debug = require('debug')('great:auth')

const setToken = (auth, response) => {
  try {
    const {access_token: token} = JSON.parse(response.body)
    auth._token = token
  } catch (error) {
    debug(`Oauth2: Returned invalid json. ${error}`)
    return false
  }

  return true
}

/**
 * Create an instance of the OAuth2 strategy. Will retrieve an access token
 * through the client_credentials approach, and include the token as a Bearer
 * on every request.
 * @param {Object} options - Options object
 * @returns {Object} Strategy object
 */
function oauth2Auth ({uri, key, secret} = {}) {
  return {
    /**
     * Check whether we've already ran authentication.
     * @returns {boolean} `true` if already authenticated, otherwise `false`
     */
    isAuthenticated () {
      return !!this._token
    },

    /**
     * Authenticate and return true if authentication was successful.
     * @returns {Promise} Promise of authentication success or failure (true/false)
     */
    async authenticate () {
      const response = await authenticate({uri, key, secret})
      return setToken(this, response)
    },

    /**
     * Return an object with the information needed for authenticated requests
     * with this strategy.
     * @returns {Object} Auth object
     */
    getAuthObject () {
      if (this._token) {
        return {token: this._token}
      }
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated requests
     * with this strategy.
     * @returns {Object} Headers object
     */
    getAuthHeaders () {
      if (this._token) {
        return {'Authorization': `Bearer ${this._token}`}
      }
      return {}
    }
  }
}

module.exports = oauth2Auth
