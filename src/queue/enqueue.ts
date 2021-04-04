import debugLib = require('debug')
import { Action, Meta } from '../types'
import { Queue } from './types'

const debug = debugLib('great')

const prepareMetaForQueue = ({ queue, ...rest }: Meta = {}) => ({
  ...rest,
  queuedAt: Date.now(),
})

const prepareForQueue = (action: Action): Action => ({
  ...action,
  meta: prepareMetaForQueue(action?.meta),
})

export default async function enqueue(
  queue: Queue,
  action: Action
): Promise<Action> {
  const { meta } = action
  const queuedAction = prepareForQueue(action)
  const timestamp = typeof meta?.queue === 'boolean' ? undefined : meta?.queue
  const actionId = meta?.id || undefined

  let id: string | number | undefined
  try {
    id = (await queue.push(queuedAction, timestamp, actionId)) || undefined
  } catch (error) {
    debug(
      'Error from queue when pushing %o with timestamp %s. Error: %s',
      queuedAction,
      timestamp,
      error
    )
    return {
      ...action,
      response: {
        ...action.response,
        status: 'error',
        error: `Could not push to queue. ${error}`,
      },
    }
  }

  debug(
    "Pushed to queue with timestamp %s and id '%s': %o",
    timestamp,
    id,
    queuedAction
  )
  return {
    ...action,
    response: { ...action.response, status: 'queued' },
    meta: { ...action.meta, id: typeof id === 'number' ? String(id) : id },
  }
}
