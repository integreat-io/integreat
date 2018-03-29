const got = require('got')
const createError = require('../../utils/createError')

const getAuthHeaders = (auth) => (auth && auth.getAuthHeaders) ? auth.getAuthHeaders() : {}

const handleUnauthorized = (request, error, isAuthRetry) => {
  if (isAuthRetry) {
    // Will not force a second time
    return createError('Not authorized', 'noaccess')
  } else if (!request.auth) {
    // No auth is proviced
    return createError('Source requires authentication', 'noaccess')
  } else {
    // Try again and force auth - old auth is probably outdated
    return sendToSource(request, true)
  }
}

const handleError = async (request, error, isAuthRetry) => {
  const {uri} = request
  const {statusCode} = error

  if (statusCode === undefined) {
    // No http error
    return createError(`Server returned '${error}' for ${uri}`)
  } else if (statusCode === 404) {
    // Not found
    return createError(`Could not find the url ${uri}`, 'notfound')
  } else if (statusCode === 401) {
    // Unauthorized
    return handleUnauthorized(request, error, isAuthRetry)
  } else {
    // Other errors
    return createError(`Server returned ${statusCode} for ${uri}`)
  }
}

const isAuthenticationNeeded = (auth, isAuthRetry) =>
  auth && typeof auth === 'object' && (isAuthRetry || !auth.isAuthenticated())

/**
 * Send the prepared request to the source
 * @param {Object} request - Prepared request
 * @param {boolean} isAuthRetry - true if this is a retry call
 * @returns {Object} A response object
 */
const sendToSource = async (request, isAuthRetry) => {
  const {uri, method, body, headers, auth} = request

  if (isAuthenticationNeeded(auth, isAuthRetry)) {
    if (!await auth.authenticate()) {
      return createError('Authentication failed', 'autherror')
    }
  }

  try {
    const response = await got(uri, {
      method,
      json: true,
      body,
      headers: {...headers, ...getAuthHeaders(auth)}
    })
    return {status: 'ok', data: response.body}
  } catch (err) {
    return handleError(request, err, isAuthRetry)
  }
}

module.exports = sendToSource
