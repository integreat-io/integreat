const createError = require('../utils/createError')

module.exports = ({ adapter, serviceId }) => async ({ request, response }) => {
  if (typeof response.data === 'undefined') {
    return response
  }

  try {
    return await adapter.normalize(response, request)
  } catch (error) {
    return createError(`Error normalizing data from service '${serviceId}'. ${error}`)
  }
}
