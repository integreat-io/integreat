import { setResponseOnAction } from '../utils/action.js'
import type { Action, Response } from '../types.js'
import type Service from '../service/index.js'
import type { Endpoint } from '../service/endpoints/types.js'

export default async function mutateAndSend(
  service: Service,
  endpoint: Endpoint,
  action: Action
): Promise<Response> {
  const authorizedAction = service.authorizeAction(action)
  const requestAction = await service.mutateRequest(authorizedAction, endpoint)
  const response = await service.send(requestAction)
  return await service.mutateResponse(
    setResponseOnAction(action, response),
    endpoint
  )
}
