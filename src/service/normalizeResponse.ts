import createError from '../utils/createError'

export default ({ adapter, serviceId }) => async ({ request, response }) => {
  if (typeof response.data === 'undefined') {
    return response
  }

  try {
    return await adapter.normalize(response, request)
  } catch (error) {
    return createError(
      `Error normalizing data from service '${serviceId}'. ${error}`
    )
  }
}
