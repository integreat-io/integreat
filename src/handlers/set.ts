import debugLib from 'debug'
import mutateAndSend from '../utils/mutateAndSend.js'
import {
  createErrorResponse,
  createUnknownServiceError,
} from '../utils/response.js'
import { isTypedData } from '../utils/is.js'
import type { Action, Response, ActionHandlerResources } from '../types.js'

const debug = debugLib('great')

const extractType = (action: Action, data?: unknown) =>
  action.payload.type || (isTypedData(data) && data.$type) || undefined

const extractId = (action: Action, data?: unknown) =>
  action.payload.id || (isTypedData(data) && data.id) || undefined

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
  { getService }: ActionHandlerResources
): Promise<Response> {
  const {
    data,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const type = extractType(action, data)
  const id = extractId(action, data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'SET')
  }

  const endpointDebug = endpointId ? `at endpoint '${endpointId}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const nextAction = setIdAndTypeOnAction(action, id, type)
  const endpoint = await service.endpointFromAction(nextAction)
  if (!endpoint) {
    return createErrorResponse(
      `No endpoint matching ${action.type} request to service '${serviceId}'.`,
      'handler:SET',
      'badrequest'
    )
  }

  return await mutateAndSend(service, endpoint, nextAction)
}
