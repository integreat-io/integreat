import type { Authenticator, Authentication } from '../service/types.js'
import { isObject } from '../utils/is.js'

/**
 * The options authenticator. Will always be authenticated, and will return the
 * given options it is given as authentication.
 */
const optionsAuth: Authenticator = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and return the token
   * received, but in optionsAuth the given options object is returned as the
   * authentication object.
   */
  async authenticate(options, _action) {
    return { status: 'granted', ...options }
  },

  /**
   * Check whether we've already ran authentication.
   * In the optionsAuth, this will always be true, as no authentication is
   * really necessary.
   */
  isAuthenticated(authentication, _options, _action) {
    return !!(authentication && authentication.status === 'granted')
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this strategy.
     * For OptionsStrategy, this will simply be the options object given on
     * creation.
     */
    asObject(authentication: Authentication | null): Record<string, unknown> {
      if (isObject(authentication)) {
        const { status, ...options } = authentication
        if (status === 'granted') {
          return options
        }
      }
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated
     * requests with this strategy. For OptionsStrategy, this will simply be the
     * options object given on creation.
     */
    asHttpHeaders(
      authentication: Authentication | null
    ): Record<string, unknown> {
      if (isObject(authentication)) {
        const { status, ...options } = authentication
        if (status === 'granted') {
          return options
        }
      }
      return {}
    },
  },
}

export default optionsAuth
