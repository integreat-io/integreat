const util = require('util')
const createError = require('../utils/createError')

const sendRequestNormalizeAndMap = async (request, adapter, serviceId) => {
  let response
  try {
    // Send request and get response
    response = await adapter.send(request)
  } catch (error) {
    return createError(`Error retrieving from service ${serviceId}. ${error}`)
  }
  if (typeof response.data !== 'undefined') {
    try {
      // Normalize response data
      response = await adapter.normalize(response, request)
    } catch (error) {
      return createError(`Error getting data from service '${serviceId}'. ${error}`)
    }
  }

  // Return response
  return { ...response, access: request.access }
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
async function sendRequest (request, { adapter, serviceId }) {
  const { endpoint, access } = request

  // Error if no endpoint
  if (!endpoint) {
    return createError(`No endpoint specified on request to service '${serviceId}'.`)
  }

  // Error if access is not granted
  if (access.status === 'refused') {
    return createError(`Request to '${serviceId}' was refused. Scheme: ${util.inspect(access.scheme)}. Ident: ${util.inspect(access.ident)}`, 'noaccess')
  }

  if (typeof request.data !== 'undefined' && request.data !== null) {
    try {
      // Serialize request data
      request = await adapter.serialize(request)
    } catch (error) {
      return createError(`Error serializing data for service '${serviceId}'. ${error}`)
    }
  }

  return sendRequestNormalizeAndMap(request, adapter, serviceId)
}

module.exports = sendRequest
