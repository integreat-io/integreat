import debugLib from 'debug'
import pPipe from 'p-pipe'
import { setResponseOnAction, setErrorOnAction } from '../utils/action.js'
import createUnknownServiceError from '../utils/createUnknownServiceError.js'
import { isTypedData } from '../utils/is.js'
import type { Action, ActionHandlerResources } from '../types.js'

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
): Promise<Action> {
  const {
    data,
    targetService: serviceId,
    endpoint: endpointId,
  } = action.payload

  const type = extractType(action, data)
  const id = extractId(action, data)

  const service = getService(type, serviceId)
  if (!service) {
    return createUnknownServiceError(action, type, serviceId, 'SET')
  }

  const endpointDebug = endpointId ? `at endpoint '${endpointId}'` : ''
  debug('SET: Send to service %s %s', service.id, endpointDebug)

  const nextAction = setIdAndTypeOnAction(action, id, type)
  const endpoint = service.endpointFromAction(nextAction)
  if (!endpoint) {
    return setErrorOnAction(
      action,
      `No endpoint matching ${action.type} request to service '${serviceId}'.`,
      'badrequest'
    )
  }

  const { response } = await pPipe(
    service.authorizeAction,
    (action: Action) => service.mutateRequest(action, endpoint),
    service.send,
    (action: Action) => service.mutateResponse(action, endpoint)
  )(nextAction)
  return setResponseOnAction(action, response)
}
