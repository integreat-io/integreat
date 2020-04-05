import debugLib = require('debug')
import createError from './createError'
import { Exchange } from '../types'

const debug = debugLib('great')

export default function createUnknownServiceError(
  exchange: Exchange,
  type: string | string[] | undefined,
  serviceId: string | undefined,
  actionType: string
): Exchange {
  const error = serviceId
    ? `Service with id '${serviceId || '<not set>'}' does not exist`
    : `No service exists for type '${type || '<not set>'}'`
  debug(`${actionType}: ${error}`)
  return createError(exchange, error)
}
