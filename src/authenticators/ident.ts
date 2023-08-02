import type { Authenticator } from '../types.js'

/**
 * The `ident` authenticator. Will always grant. `validate()` returns an ident
 * with the id provided in the `identId` option, or `'anonymous'` if no id is
 * provided.
 */
const identAuth: Authenticator = {
  id: 'ident',

  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * The anonymous authenticator always grants.
   */
  async authenticate(_options) {
    return { status: 'granted' }
  },

  /**
   * Check whether we've already ran authentication.
   * The anonymous authenticator always grants.
   */
  isAuthenticated(_authentication) {
    return true
  },

  /**
   * Validate authentication object.
   * The anonymous authenticator always returns an ident with id anonymous.
   */
  async validate(_authentication, options) {
    const { identId } = options || {}
    const id = typeof identId === 'string' ? identId : 'anonymous'
    return { id }
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this authenticator. The anonymous authenticator always returns an
     * empty object.
     */
    asObject(_authentication) {
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated requests
     * with this authenticator. The anonymous authenticator always returns an
     * empty object.
     */
    asHttpHeaders(_authentication) {
      return {}
    },
  },
}

export default identAuth
