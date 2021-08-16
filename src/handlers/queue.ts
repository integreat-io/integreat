import { Action, InternalDispatch } from '../types'
import { GetService, HandlerOptions } from '../dispatch'

const authorizeAction = ({ meta, ...action }: Action) => ({
  ...action,
  meta: { ...meta, authorized: true },
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
  dispatch: InternalDispatch,
  getService: GetService,
  { queueService }: HandlerOptions
): Promise<Action> {
  const service = getService(undefined, queueService)
  if (!service) {
    return dispatch(action)
  }

  const nextAction = authorizeAction(action)
  const { response } = await service.send(nextAction) // TODO: Map data back and forth?
  const status = response?.status === 'ok' ? 'queued' : response?.status

  return {
    ...action,
    response: {
      ...action.response,
      ...response,
      status: status || 'badresponse',
      ...(status ? {} : { error: 'Queue did not respond correctly' }),
    },
  }
}
