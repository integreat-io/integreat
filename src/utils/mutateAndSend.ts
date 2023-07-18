import { setResponseOnAction } from '../utils/action.js'
import type { Action, Response } from '../types.js'
import type { Service } from '../service/types.js'
import type { Endpoint } from '../service/endpoints/types.js'

export default async function mutateAndSend(
  service: Service,
  endpoint: Endpoint,
  action: Action
): Promise<Response> {
  const authorizedAction = service.authorizeAction(action)
  if (authorizedAction.response?.status) {
    return await service.mutateResponse(authorizedAction, endpoint) // Return right away if there's already a status
  }

  const validateResponse = await endpoint.validateAction(action)
  if (validateResponse) {
    return service.mutateResponse(
      setResponseOnAction(action, validateResponse), // Return right away if validation returns a response
      endpoint
    )
  }

  const requestAction = await service.mutateRequest(authorizedAction, endpoint)
  const response = await service.send(requestAction)
  return await service.mutateResponse(
    setResponseOnAction(action, response),
    endpoint
  )
}
