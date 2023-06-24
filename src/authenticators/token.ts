import type { Authenticator, Authentication } from '../service/types.js'

interface TokenAuthentication extends Authentication {
  token?: string | null
  type?: string
  encode?: boolean
}

export interface TokenObject extends Record<string, unknown> {
  token?: string | null
  type?: string
}

export interface TokenHeaders extends Record<string, unknown> {
  Authorization?: string
}

const getTypeAndToken = (authentication: TokenAuthentication | null) => {
  const { status, token, type, encode } = authentication || {}
  if (status !== 'granted' || !token) {
    return {}
  }
  return {
    token: encode ? Buffer.from(token).toString('base64') : token,
    type,
  }
}

/**
 * The token strategy. The token is given as an option.
 */
const tokenAuth: Authenticator = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and set the token received,
   * but in tokenAuth the token is set as from the options object.
   */
  async authenticate(options, _action) {
    const { token = null, type, encode = false } = options || {}
    return token
      ? { status: 'granted', token, type, encode }
      : { status: 'refused' }
  },

  /**
   * Check whether we've already ran authentication.
   * In the tokenAuth, this will be true if we get an authentication object
   * with granted status and a token.
   */
  isAuthenticated(authentication, _options, _action) {
    return !!(
      authentication &&
      authentication.status === 'granted' &&
      authentication.token
    )
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this authenticator. The object will include `token` and `type` as
     * seperate properties. The token will be encoded when the `encode` option is
     * set true.
     */
    asObject(authentication: TokenAuthentication | null): TokenObject {
      return getTypeAndToken(authentication)
    },

    /**
     * Return a headers object with the headers needed for authenticated requests
     * with this authenticator. There will be only one property, namely
     * `Authorization`, which will consist of the type and the token, the latter
     * encoded if the `encode` option is true.
     */
    asHttpHeaders(authentication: TokenAuthentication | null): TokenHeaders {
      const { type, token } = getTypeAndToken(authentication)
      return token ? { Authorization: type ? `${type} ${token}` : token } : {}
    },
  },
}

export default tokenAuth
