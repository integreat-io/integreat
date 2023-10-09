import { setResponseOnAction } from '../utils/action.js'
import type { Action, Response } from '../types.js'
import type Service from '../service/Service.js'
import type Endpoint from '../service/Endpoint.js'

export default async function mutateAndSend(
  service: Service,
  endpoint: Endpoint,
  action: Action,
): Promise<Response> {
  const preparedAction = await service.preflightAction(action, endpoint)
  if (preparedAction.response?.status) {
    // Mutate response and return right away if there's already a status
    return await service.mutateResponse(preparedAction, endpoint)
  }

  const requestAction = await service.mutateRequest(preparedAction, endpoint)
  const response = await service.send(requestAction, endpoint)
  return await service.mutateResponse(
    setResponseOnAction(action, response),
    endpoint,
  )
}
