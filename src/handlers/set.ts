import debugLib = require('debug')
import pPipe = require('p-pipe')
import { createErrorOnAction } from '../utils/createError'
import createUnknownServiceError from '../utils/createUnknownServiceError'
import { isTypedData } from '../utils/is'
import { Action, InternalDispatch } from '../types'
import { GetService } from '../dispatch'

const debug = debugLib('great')

const extractType = (action: Action, data?: unknown) =>
  action.payload.type || (isTypedData(data) && data.$type) || undefined

const extractId = (data?: unknown) =>
  (isTypedData(data) && data.id) || undefined

const setIdAndTypeOnAction = (
  action: Action,
  id?: string | string[],
  type?: string | string[]
) => ({
  ...action,
  payload: { ...action.payload, id, type },
})

/**
 * Set several items to a service, based on the given action object.
 */
export default async function set(
  action: Action,
  _dispatch: InternalDispatch,
  getService: GetService
): Promise<Action> {
  const {
    data,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const type = extractType(action, data)
  const id = extractId(data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(action, type, serviceId, 'SET')
  }

  const endpointDebug = endpointId ? `at endpoint '${endpointId}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const nextAction = setIdAndTypeOnAction(action, id, type)
  const endpoint = service.endpointFromAction(nextAction)
  if (!endpoint) {
    return createErrorOnAction(
      action,
      `No endpoint matching ${action.type} request to service '${serviceId}'.`,
      'noaction'
    )
  }

  return pPipe(
    service.authorizeAction,
    (action: Action) => service.mapRequest(action, endpoint),
    service.send,
    (action: Action) => service.mapResponse(action, endpoint)
  )(nextAction)
}
