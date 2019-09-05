import debugLib = require('debug')
import createError from './createError'

const debug = debugLib('great')

export default function createUnknownServiceError(
  type: string,
  serviceId: string,
  actionType: string
) {
  const error = serviceId
    ? `Service with id '${serviceId}' does not exist`
    : `No service exists for type '${type}'`
  debug(`${actionType}: ${error}`)
  return createError(error)
}
