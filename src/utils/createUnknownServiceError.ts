import debugLib = require('debug')
import createError from './createError'

const debug = debugLib('great')

export default function createUnknownServiceError(
  type: string | string[] | undefined,
  serviceId: string | undefined,
  actionType: string
) {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createError(error)
}
