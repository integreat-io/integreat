import { setOrigin } from '../utils/response.js'
import { setAuthorizedMark } from '../service/utils/authAction.js'
import type { Action, ActionHandlerResources, Response } from '../types.js'

const prepareQueuedAction = ({ meta, ...action }: Action) =>
  setAuthorizedMark({
    ...action,
    meta: { ...meta, queuedAt: Date.now() },
  })

/**
 * Send action to queue service. An `ok` status from queue service is returned
 * as `queued`. All other responses are just relayed.
 *
 * If the given `queueService` does not exist, the action is instead dispatched
 * without the `queue` flag.
 */
export default async function queue(
  action: Action,
  { dispatch, getService, options: { queueService } }: ActionHandlerResources
): Promise<Response> {
  const service = getService(undefined, queueService)
  if (!service) {
    return dispatch(action)
  }

  const nextAction = prepareQueuedAction(action)
  const response = await service.send(nextAction)
  const status = response?.status === 'ok' ? 'queued' : response?.status

  return setOrigin(
    {
      ...action.response,
      ...response,
      status: status || 'badresponse',
      ...(status ? {} : { error: 'Queue did not respond correctly' }),
    },
    'handler:QUEUE'
  )
}
