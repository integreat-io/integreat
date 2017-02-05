/** Class for token-based authentication. The token is given as an option. */
class TokenStrategy {
  /**
   * Create an instance of the token strategy.
   * @param {Object} options - Options object with `token`, `type`, and `encode`
   */
  constructor (options = {}) {
    this._token = options.token || null
    this._type = options.type || 'Bearer'
    this._encode = options.encode || false
  }

  /**
   * Check whether we've already ran authentication.
   * In the TokenStrategy, this will be true if the token is set in options.
   * @returns {boolean} `true` if already authenticated, otherwise `false`
   */
  isAuthenticated () {
    return !!this._token
  }

  /**
   * Authenticate and return true if authentication was successful.
   * Would normaly perform an authentication request and set the token received,
   * but in TokenStrategy the token is set as an option, and authentication will
   * be successful if this is set.
   * @returns {Promise} Promise of authentication success or failure (true/false)
   */
  authenticate () {
    return Promise.resolve(this.isAuthenticated())
  }

  /**
   * Return a headers object with the headers needed for authenticated requests
   * with this strategy.
   * @returns {Object} Headers object
   */
  getAuthHeaders () {
    if (!this._token) return {}

    const token = (this._encode) ? Buffer.from(this._token).toString('base64') : this._token
    return {'Authorization': `${this._type} ${token}`}
  }
}

module.exports = TokenStrategy
