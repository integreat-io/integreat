import debugLib = require('debug')
import createError from '../utils/createError'

const debug = debugLib('great')

const prepareMetaForQueue = ({ queue, ...rest }) => ({
  ...rest,
  queuedAt: Date.now()
})

const prepareForQueue = action => ({
  ...action,
  meta: prepareMetaForQueue(action.meta)
})

const enqueue = async (queue, action) => {
  const { meta } = action
  const queuedAction = prepareForQueue(action)
  const timestamp = typeof meta.queue === 'boolean' ? null : meta.queue
  const actionId = meta.id || null

  let id
  try {
    id = await queue.push(queuedAction, timestamp, actionId)
  } catch (error) {
    debug(
      'Error from queue when pushing %o with timestamp %s. Error: %s',
      queuedAction,
      timestamp,
      error
    )
    return createError(`Could not push to queue. ${error}`)
  }

  debug(
    "Pushed to queue with timestamp %s and id '%s': %o",
    timestamp,
    id,
    queuedAction
  )
  return { status: 'queued', data: { id } }
}

export default enqueue
