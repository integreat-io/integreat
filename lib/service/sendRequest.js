const createError = require('../utils/createError')

const serialize = ({ adapter, serviceId }) => async (request) => {
  if (typeof request.data === 'undefined' || request.data === null) {
    return request
  }

  try {
    return await adapter.serialize(request)
  } catch (error) {
    throw new Error(`Error serializing data for service '${serviceId}'. ${error}`)
  }
}

const send = ({ adapter, serviceId }) => async (request, connection) => {
  try {
    return await adapter.send(request, connection)
  } catch (error) {
    throw new Error(`Error retrieving from service '${serviceId}'. ${error}`)
  }
}

const normalize = ({ adapter, serviceId }) => async (request, response) => {
  if (typeof response.data === 'undefined') {
    return response
  }

  try {
    return await adapter.normalize(response, request)
  } catch (error) {
    throw new Error(`Error normalizing data from service '${serviceId}'. ${error}`)
  }
}

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
function sendRequest (options) {
  return async ({ request, response, connection }) => {
    if (response) {
      return response
    }

    try {
      request = await serialize(options)(request)
      response = await send(options)(request, connection)
      response = await normalize(options)(request, response)
      return { ...response, access: request.access }
    } catch (error) {
      return createError(error.message)
    }
  }
}

module.exports = sendRequest
