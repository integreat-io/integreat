/**
 * The options authenticator. Will always be authenticated, and will return the
 * given options it is given as authentication.
 */
const optionsAuth = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and return the token
   * received, but in optionsAuth the given options object is returned as the
   * authentication object.
   * @param {Object} options - An options object
   * @returns {Object} An authentication object
   */
  async authenticate (options) {
    return { status: 'granted', ...options }
  },

  /**
   * Check whether we've already ran authentication.
   * In the optionsAuth, this will always be true, as no authentication is
   * really necessary.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {boolean} `true` if already authenticated, otherwise `false`
   */
  isAuthenticated (authentication) {
    return !!(authentication && authentication.status === 'granted')
  },

  /**
   * Return an object with the information needed for authenticated requests
   * with this strategy.
   * For OptionsStrategy, this will simply be the options object given on
   * creation.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Auth object
   */
  asObject ({ status, ...options }) {
    return (status === 'granted') ? options : {}
  },

  /**
   * Return a headers object with the headers needed for authenticated requests
   * with this strategy. For OptionsStrategy, there will be no headers.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Headers object
   */
  asHttpHeaders (authentication) {
    return {}
  }
}

module.exports = optionsAuth
