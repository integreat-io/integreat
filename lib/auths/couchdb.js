const request = require('request-promise-native')
const debug = require('debug')('great:auth')

/**
 * Create an instance of the couchdb strategy. Will retrieve an an
 * authentication cookie and send the cookie with every request.
 * @param {Object} options - Options object
 * @returns {Object} Strategy object
 */
function couchdbAuth ({uri, key, secret} = {}) {
  return {
    /**
     * Check whether we've already ran authentication.
     * @returns {boolean} `true` if already authenticated, otherwise `false`
     */
    isAuthenticated () {
      return !!this._cookie
    },

    /**
     * Authenticate and return true if authentication was successful.
     * @returns {Promise} Promise of authentication success or failure (true/false)
     */
    async authenticate () {
      const options = {
        url: `${uri}/_session`,
        method: 'POST',
        body: `name=${key}&password=${secret}`,
        resolveWithFullResponse: true,
        simple: false,
        json: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      try {
        const {body, statusCode, headers} = await request(options)

        if (statusCode === 200 && body && body.ok) {
          this._cookie = headers['set-cookie']
          return true
        } else {
          debug(`Couchdb auth: Could not authenticate '${key}' on ${db}`)
        }
      } catch (error) {
        debug(`Couchdb auth: Server returned an error. ${error}`)
      }

      return false
    },

    /**
     * Return an object with the information needed for authenticated requests
     * with this strategy.
     * @returns {Object} Auth object
     */
    getAuthObject () {
      if (this._cookie) {
        const match = /AuthSession="([^"]+)"/.exec(this._cookie)
        return (match && match[1]) ? {authSession: match[1]} : {}
      }
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated requests
     * with this strategy.
     * @returns {Object} Headers object
     */
    getAuthHeaders () {
      if (this._cookie) {
        return {
          'Cookie': this._cookie
        }
      }
      return {}
    }
  }
}

module.exports = couchdbAuth
