import { setAuthorizedMark } from '../service/utils/authAction.js'
import {
  createErrorResponse,
  createUnknownServiceError,
} from '../utils/response.js'
import type { Action, ActionHandlerResources, Response } from '../types.js'

/**
 * Send action straight to service. The service is free to do whatever with the
 * action. This is a good way to trigger clean up routines etc in services,
 * implemented in the service transporter.
 */
export default async function service(
  action: Action,
  { getService }: ActionHandlerResources,
): Promise<Response> {
  const serviceId = action.payload.targetService
  const service = getService(undefined, serviceId)
  if (!service) {
    return createUnknownServiceError(undefined, serviceId, 'SERVICE')
  }

  const nextAction = setAuthorizedMark(action) // TODO: Should we validate more than this?
  const response = await service.send(nextAction, null)

  return response?.status
    ? response
    : createErrorResponse(
        `Service '${serviceId}' did not respond correctly to SERVICE action`,
        'handler:SERVICE',
        'badresponse',
      )
}
