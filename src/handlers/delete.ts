import debugLib from 'debug'
import mutateAndSend from '../utils/mutateAndSend.js'
import { isTypedData } from '../utils/is.js'
import { setDataOnActionPayload } from '../utils/action.js'
import {
  createErrorResponse,
  createUnknownServiceError,
} from '../utils/response.js'
import type {
  Action,
  Response,
  Payload,
  ActionHandlerResources,
} from '../types.js'

const debug = debugLib('great')

const prepareData = ({ type, id, data }: Payload) =>
  type && id
    ? { id, $type: type } // Delete one action -- return as data
    : Array.isArray(data)
    ? data.filter(isTypedData) // Filter away anything that is not cast data items
    : isTypedData(data)
    ? data
    : undefined

/**
 * Delete several items from a service, based on the given payload.
 */
export default async function deleteFn(
  action: Action,
  { getService }: ActionHandlerResources,
): Promise<Response> {
  const {
    type,
    id,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(type, serviceId, 'DELETE')
  }

  const data = prepareData(action.payload)
  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching ${type} and ${id}`
  debug("DELETE: Delete from service '%s' at %s.", service.id, endpointDebug)

  const nextAction = setDataOnActionPayload(action, data)
  const endpoint = await service.endpointFromAction(nextAction)
  if (!endpoint) {
    return createErrorResponse(
      `No endpoint matching ${nextAction.type} request to service '${serviceId}'.`,
      'handler:DELETE',
      'badrequest',
    )
  }

  return await mutateAndSend(service, endpoint, nextAction)
}
