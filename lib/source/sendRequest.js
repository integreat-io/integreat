const util = require('util')
const createError = require('../utils/createError')

/**
 * Send the request with the adapter and return the response. Will serialize any
 * data in the request, and normalize any data in the response. The access
 * object on the request must have status granted, and will be returned on the
 * response object.
 *
 * @param {Object} request - The request object
 * @param {Object} options - adapter and sourceId
 * @returns {Object} The normalized response object
 */
async function sendRequest (request, {adapter, sourceId}) {
  const {endpoint, access} = request

  // Error if no endpoint
  if (!endpoint) {
    return createError(`No endpoint specified on request to source '${sourceId}'.`)
  }

  // Error if access is not granted
  if (access.status === 'refused') {
    return createError(`Request to '${sourceId}' was refused. Scheme: ${util.inspect(access.scheme)}. Ident: ${util.inspect(access.ident)}`, 'noaccess')
  }

  if (typeof request.data !== 'undefined') {
    try {
      // Serialize request data
      const data = await adapter.serialize(request.data, endpoint.path)
      request = {...request, data}
    } catch (error) {
      return createError(`Error serializing data for source '${sourceId}'. ${error}`)
    }
  }

  let response
  try {
    // Send request and get response
    response = await adapter.send(request)
  } catch (error) {
    return createError(`Error retrieving from ${request.uri}. ${error}`)
  }
  if (typeof response.data !== 'undefined') {
    try {
      // Normalize response data
      response.data = await adapter.normalize(response.data, endpoint.path)
    } catch (error) {
      return createError(`Error getting data from source '${sourceId}'. ${error}`)
    }
  }

  // Return response
  return {...response, access}
}

module.exports = sendRequest
