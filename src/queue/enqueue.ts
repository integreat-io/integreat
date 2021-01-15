import debugLib = require('debug')
import { Exchange, Action, ActionMeta, Response } from '../types'
import { Queue } from './types'
import {
  actionFromExchange,
  responseToExchange,
} from '../utils/exchangeMapping'

const debug = debugLib('great')

const prepareMetaForQueue = ({ queue, ...rest }: ActionMeta = {}) => ({
  ...rest,
  queuedAt: Date.now(),
})

const prepareForQueue = (action: Action): Action => ({
  ...action,
  meta: prepareMetaForQueue(action?.meta),
})

export async function enqueueAction(
  queue: Queue,
  action: Action
): Promise<Response> {
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
    return { status: 'error', error: `Could not push to queue. ${error}` }
  }

  debug(
    "Pushed to queue with timestamp %s and id '%s': %o",
    timestamp,
    id,
    queuedAction
  )
  return {
    status: 'queued',
    meta: { id: typeof id === 'number' ? String(id) : id },
  }
}

export default async function enqueue(
  queue: Queue,
  exchange: Exchange
): Promise<Exchange> {
  const action = actionFromExchange(exchange)
  const response = await enqueueAction(queue, action)
  return responseToExchange(exchange, response)
}
