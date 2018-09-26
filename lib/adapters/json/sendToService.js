const got = require('got')
const createError = require('../../utils/createError')

const handleUnauthorized = (request, error, isAuthRetry) => {
  if (!request.auth) {
    // No auth is proviced, but it should
    return createError('Service requires authentication', 'noaccess')
  } else {
    // Auth was provided, but was not sufficient
    return createError('Not authorized', 'noaccess')
  }
}

const handleError = async (request, error, isAuthRetry) => {
  const { uri } = request
  const { statusCode } = error

  if (typeof statusCode === 'undefined') {
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

/**
 * Send the prepared request to the service
 * @param {Object} request - Prepared request
 * @param {boolean} isAuthRetry - true if this is a retry call
 * @returns {Object} A response object
 */
const sendToService = async (request, isAuthRetry) => {
  const { uri, method, body, headers, auth } = request

  try {
    const response = await got(uri, {
      method,
      json: true,
      body,
      headers: { ...headers, ...auth }
    })
    return { status: 'ok', data: response.body }
  } catch (err) {
    return handleError(request, err, isAuthRetry)
  }
}

module.exports = sendToService
