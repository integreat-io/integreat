const debug = require('debug')('great')
import createError from './createError'

const createUnknownServiceError = (type, serviceId, action) => {
  const error = serviceId
    ? `Service with id '${serviceId}' does not exist`
    : `No service exists for type '${type}'`
  debug(`${action}: ${error}`)
  return createError(error)
}

export default createUnknownServiceError
