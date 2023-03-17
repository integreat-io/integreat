import debugLib = require('debug')
import pPipe from 'p-pipe'
import {
  setErrorOnAction,
  setResponseOnAction,
  setDataOnActionPayload,
} from '../utils/action.js'
import createUnknownServiceError from '../utils/createUnknownServiceError.js'
import type { Action, Payload, ActionHandlerResources } from '../types.js'

const debug = debugLib('great')

const prepareData = ({ type, id, data }: Payload) =>
  type && id
    ? // Delete one action -- return as data
      [{ id, $type: type }]
    : // Filter away null values
      ([] as unknown[]).concat(data).filter(Boolean)

/**
 * Delete several items from a service, based on the given payload.
 */
export default async function deleteFn(
  action: Action,
  { getService }: ActionHandlerResources
): Promise<Action> {
  const {
    type,
    id,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(action, type, serviceId, 'DELETE')
  }

  const data = prepareData(action.payload)
  if (data.length === 0) {
    return setErrorOnAction(
      action,
      `No items to delete from service '${service.id}'`,
      'noaction'
    )
  }

  const endpointDebug = endpointId
    ? `endpoint '${endpointId}'`
    : `endpoint matching ${type} and ${id}`
  debug("DELETE: Delete from service '%s' at %s.", service.id, endpointDebug)

  const nextAction = setDataOnActionPayload(action, data)
  const endpoint = service.endpointFromAction(nextAction)
  if (!endpoint) {
    return setErrorOnAction(
      nextAction,
      `No endpoint matching ${nextAction.type} request to service '${serviceId}'.`,
      'badrequest'
    )
  }

  const { response } = await pPipe(
    service.authorizeAction,
    (action: Action) => service.mapRequest(action, endpoint),
    service.send,
    (action: Action) => service.mapResponse(action, endpoint)
  )(nextAction)

  return setResponseOnAction(action, response)
}
