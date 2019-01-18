const createError = require('../utils/createError')

module.exports = ({ adapter, serviceId }) => async ({ request, response }) => {
  if (response) {
    return {}
  }

  if (typeof request.data === 'undefined' || request.data === null) {
    return { request }
  }

  try {
    const serialized = await adapter.serialize(request)
    return { request: serialized }
  } catch (error) {
    return {
      response: createError(`Error serializing data for service '${serviceId}'. ${error}`)
    }
  }
}
