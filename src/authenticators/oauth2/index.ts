import { Authenticator, Authentication, AuthOptions } from '../../auth/types'
import authenticate from './authenticate'

interface OAuthAuthentication extends Authentication {
  token?: string
}

export interface OauthOptions extends AuthOptions {
  key?: string
  secret?: string
  uri?: string
}

/**
 * The OAuth2 strategy. Will retrieve an access token through the
 * client_credentials approach, and include the token as a Bearer on every
 * request.
 */
const oauth2Auth: Authenticator = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   */
  async authenticate(options: OauthOptions | null) {
    if (!options) {
      return { status: 'refused' }
    }
    const token = await authenticate(options)
    return token ? { status: 'granted', token } : { status: 'refused' }
  },

  /**
   * Check whether we've already ran authentication.
   */
  isAuthenticated(authentication) {
    return !!(
      authentication &&
      authentication.status === 'granted' &&
      authentication.token
    )
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this authenticator.
     */
    asObject(authentication: OAuthAuthentication | null) {
      const { status, token } = authentication || {}
      if (status === 'granted' && token) {
        return { token }
      }
      return {}
    },

    /**
     * Return a headers object with the headers needed for authenticated requests
     * with this authenticator.
     */
    asHttpHeaders(authentication: OAuthAuthentication | null) {
      const { status, token } = authentication || {}
      if (status === 'granted' && token) {
        return { Authorization: `Bearer ${token}` }
      }
      return {}
    }
  }
}

export default oauth2Auth
