const getTypeAndToken = (authentication) => {
  const { status, token, type, encode } = authentication || {}
  if (status !== 'granted') {
    return {}
  }
  return {
    token: (encode) ? Buffer.from(token).toString('base64') : token,
    type
  }
}

/**
 * The token strategy. The token is given as an option.
 */
const tokenAuth = {
  /**
   * Authenticate and return authentication object if authentication was
   * successful.
   * Would normaly perform an authentication request and set the token received,
   * but in tokenAuth the token is set as from the options object.
   * @param {Object} options - An options object
   * @returns {Object} An authentication object
   */
  async authenticate ({ token = null, type = 'Bearer', encode = false }) {
    return (token)
      ? { status: 'granted', token, type, encode }
      : { status: 'refused' }
  },

  /**
   * Check whether we've already ran authentication.
   * In the tokenAuth, this will be true if we get an authentication object
   * with granted status and a token.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {boolean} `true` if already authenticated, otherwise `false`
   */
  isAuthenticated (authentication) {
    return !!(authentication && authentication.status === 'granted' && authentication.token)
  },

  /**
   * Return an object with the information needed for authenticated requests
   * with this authenticator. The object will include `token` and `type` as
   * seperate properties. The token will be encoded when the `encode` option is
   * set true.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Auth object
   */
  asObject (authentication) {
    return getTypeAndToken(authentication)
  },

  /**
   * Return a headers object with the headers needed for authenticated requests
   * with this authenticator. There will be only one property, namely
   * `Authorization`, which will consist of the type and the token, the latter
   * encoded if the `encode` option is true.
   * @param {Object} authentication - The object returned from `authenticate()`
   * @returns {Object} Headers object
   */
  asHttpHeaders (authentication) {
    const { type, token } = getTypeAndToken(authentication)
    return (token) ? { Authorization: `${type} ${token}` } : {}
  }
}

module.exports = tokenAuth
