const createError = require('../utils/createError')

/**
 * Send the request with the adapter and return the response. Will serialize any
 * data in the request, and normalize any data in the response. The access
 * object on the request must have status granted, and will be returned on the
 * response object.
 *
 * @param {Object} request - The request object
 * @param {Object} options - adapter and serviceId
 * @returns {Object} The normalized response object
 */
function sendRequest ({ adapter, serviceId }) {
  return async ({ request, response, connection }) => {
    if (response) {
      return response
    }

    try {
      response = await adapter.send(request, connection)
      return { ...response, access: request.access }
    } catch (error) {
      return createError(`Error retrieving from service '${serviceId}'. ${error}`)
    }
  }
}

module.exports = sendRequest
