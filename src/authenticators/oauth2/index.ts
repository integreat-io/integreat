import authenticate from './authenticate'

/**
 * The OAuth2 strategy. Will retrieve an access token through the
 * client_credentials approach, and include the token as a Bearer on every
 * request.
 */
const oauth2Auth = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * @param {Object} options - An options object
   * @returns {Object} An authentication object
   */
  async authenticate(options) {
    if (!options) {
      return { status: 'refused' }
    }
    const token = await authenticate(options)
    return token ? { status: 'granted', token } : { status: 'refused' }
  },

  /**
   * Check whether we've already ran authentication.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {boolean} `true` if already authenticated, otherwise `false`
   */
  isAuthenticated(authentication) {
    return !!(
      authentication &&
      authentication.status === 'granted' &&
      authentication.token
    )
  },

  /**
   * Return an object with the information needed for authenticated requests
   * with this authenticator.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Auth object
   */
  asObject({ status, token } = {}) {
    if (status === 'granted' && token) {
      return { token }
    }
    return {}
  },

  /**
   * Return a headers object with the headers needed for authenticated requests
   * with this authenticator.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Headers object
   */
  asHttpHeaders({ status, token } = {}) {
    if (status === 'granted' && token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }
}

export default oauth2Auth
