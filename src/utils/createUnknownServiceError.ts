import debugLib = require('debug')
import createError from './createError'
import { Action } from '../types'

const debug = debugLib('great')

export default function createUnknownServiceError(
  action: Action,
  type: string | string[] | undefined,
  serviceId: string | undefined,
  actionType: string
): Action {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createError(action, error)
}
