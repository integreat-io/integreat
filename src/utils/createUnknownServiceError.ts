import debugLib from 'debug'
import { createErrorResponse } from './action.js'
import type { Response } from '../types.js'

const debug = debugLib('great')

export default function createUnknownServiceError(
  type: string | string[] | undefined,
  serviceId: string | undefined,
  actionType: string
): Response {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createErrorResponse(error)
}
