import debugLib = require('debug')
import { setErrorOnAction } from './action.js'
import { Action } from '../types.js'

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
  return setErrorOnAction(action, error)
}
