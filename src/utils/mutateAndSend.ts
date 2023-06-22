import { setResponseOnAction } from '../utils/action.js'
import type { Action, Response } from '../types.js'
import type Service from '../service/Service.js'
import type Endpoint from '../service/endpoints/Endpoint.js'

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
