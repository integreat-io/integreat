import debugLib = require('debug')
import { Action, ActionMeta } from '../types'
import { Queue } from './types'

const debug = debugLib('great')

const prepareMetaForQueue = ({ queue, ...rest }: ActionMeta = {}) => ({
  ...rest,
  queuedAt: Date.now(),
})

const prepareForQueue = (action: Action) => ({
  ...action,
  meta: prepareMetaForQueue(action?.meta),
})

export default async function enqueue(queue: Queue, action: Action) {
  const { meta } = action
  const queuedAction = prepareForQueue(action)
  const timestamp = typeof meta?.queue === 'boolean' ? undefined : meta?.queue
  const actionId = meta?.id || undefined

  let id: string | null
  try {
    id = await queue.push(queuedAction, timestamp, actionId)
  } catch (error) {
    debug(
      'Error from queue when pushing %o with timestamp %s. Error: %s',
      queuedAction,
      timestamp,
      error
    )
    return { status: 'error', error: `Could not push to queue. ${error}` }
  }

  debug(
    "Pushed to queue with timestamp %s and id '%s': %o",
    timestamp,
    id,
    queuedAction
  )
  return { status: 'queued', data: { id } }
}
