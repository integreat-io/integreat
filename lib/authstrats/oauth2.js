const request = require('request-promise-native')
const debug = require('debug')('great:auth')

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
      const credentials = `${encodeURIComponent(key)}:${encodeURIComponent(secret)}`
      const credentials64 = Buffer.from(credentials).toString('base64')

      const options = {
        url: uri,
        method: 'POST',
        body: 'grant_type=client_credentials',
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Authorization': `Basic ${credentials64}`
        }
      }

      try {
        const {body, statusCode} = await request(options)

        if (statusCode === 200 && body) {
          this._token = body['access_token']
          return true
        } else {
          debug(`Oauth2: Could not authenticate '${key}' on ${uri}`)
        }
      } catch (error) {
        debug(`Oauth2: Server returned an error. ${error}`)
      }

      return false
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
