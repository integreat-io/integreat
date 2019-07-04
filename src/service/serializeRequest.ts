import createError from '../utils/createError'

export default ({ adapter, serviceId }) => async ({ request, response }) => {
  if (response) {
    return {}
  }

  try {
    const serialized = await adapter.serialize(request)
    return { request: serialized }
  } catch (error) {
    return {
      response: createError(
        `Error serializing data for service '${serviceId}'. ${error}`
      )
    }
  }
}
