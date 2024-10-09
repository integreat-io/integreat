import type { Authenticator, Action } from '../types.js'
import type { Authentication, AuthOptions } from '../service/types.js'
import { isObject } from '../utils/is.js'

export interface TokenOptions extends AuthOptions {
  token?: string | string[] | null
  type?: string
  encode?: boolean
  identId?: string
}

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

function getTypeAndToken(authentication: TokenAuthentication | null) {
  const { status, token, type, encode } = authentication || {}
  if (status !== 'granted' || !token) {
    return {}
  }
  return {
    token: encode ? Buffer.from(token).toString('base64') : token,
    type,
  }
}

function getAuthHeader(action: Action | null) {
  const headers = action?.payload?.headers
  if (isObject(headers)) {
    return headers.authorization || headers.Authorization
  }

  return undefined
}

const compareAuthHeader = (
  header: string,
  type?: string,
  token?: string | null,
) => header === (type ? `${type} ${token}` : token)

function isValidAuthHeader(
  header?: string | string[],
  type?: string,
  token?: string | string[] | null,
) {
  if (typeof header === 'string') {
    return Array.isArray(token)
      ? token.some((tok) => compareAuthHeader(header, type, tok))
      : compareAuthHeader(header, type, token)
  }
  return false
}

/**
 * The token strategy. The token is given as an option.
 */
const tokenAuth: Authenticator<TokenAuthentication, TokenOptions> = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and set the token received,
   * but in the token strategy, we just set the token from the options object.
   */
  async authenticate(options) {
    const { type, encode = false } = options || {}
    const token = Array.isArray(options?.token)
      ? options.token[0]
      : options?.token
    return token
      ? { status: 'granted', token, type, encode }
      : { status: 'refused' }
  },

  /**
   * Check whether we've already ran authentication.
   * In the token strategy, this will be true if we get an authentication object
   * with granted status and a token.
   */
  isAuthenticated(authentication, _options, _action) {
    return !!(
      authentication &&
      authentication.status === 'granted' &&
      authentication.token
    )
  },

  async validate(_authentication, options: TokenOptions | null, action) {
    const { identId, type, token } = options || {}
    const authHeader = getAuthHeader(action)

    if (isValidAuthHeader(authHeader, type, token)) {
      return { status: 'ok', access: { ident: { id: identId } } }
    } else {
      return authHeader
        ? {
            status: 'autherror',
            error: 'Invalid credentials',
            reason: 'invalidauth',
          }
        : {
            status: 'noaccess',
            error: 'Authentication required',
            reason: 'noauth',
          }
    }
  },

  authentication: {
    /**
     * Return an object with the information needed for authenticated requests
     * with this authenticator. The object will include `token` and `type` as
     * seperate properties. The token will be encoded when the `encode` option
     * is set true.
     */
    asObject(authentication: TokenAuthentication | null): TokenObject {
      return getTypeAndToken(authentication)
    },

    /**
     * Return a headers object with the headers needed for authenticated
     * requests with this authenticator. There will be only one property, namely
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
