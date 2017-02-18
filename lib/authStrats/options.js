/** Class for option-based authentication. Will simply return the given options. */
class OptionsStrategy {
  /**
   * Create an instance of the options strategy.
   * @param {Object} options - Options object
   */
  constructor (options = {}) {
    this._options = options
  }

  /**
   * Check whether we've already ran authentication.
   * In the OptionsStrategy, this will always be true, as no authentication is
   * really necessary.
   * @returns {boolean} `true` if already authenticated, otherwise `false`
   */
  isAuthenticated () {
    return true
  }

  /**
   * Authenticate and return true if authentication was successful.
   * Would normaly perform an authentication request and set the token received,
   * but in OptionsStrategy the token is set as an option, and authentication will
   * always be successful.
   * @returns {Promise} Promise of authentication success or failure (true/false)
   */
  authenticate () {
    return Promise.resolve(true)
  }

  /**
   * Return an object with the information needed for authenticated requests
   * with this strategy.
   * For OptionsStrategy, this will simply be the options object given on
   * creation.
   * @returns {Object} Auth object
   */
  getAuthObject () {
    return this._options
  }

  /**
   * Return a headers object with the headers needed for authenticated requests
   * with this strategy. For OptionsStrategy, there will be no headers.
   * @returns {Object} Headers object
   */
  getAuthHeaders () {
    return {}
  }
}

module.exports = OptionsStrategy
