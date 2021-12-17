const debug = require('debug')('great')
const createError = require('../utils/createError')

const prepareMetaForQueue = ({ queue, ...rest }) => ({
  ...rest,
  queuedAt: Date.now(),
})

const prepareForQueue = (action) => ({
  ...action,
  meta: prepareMetaForQueue(action.meta),
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
  const queuedStatus = action.meta.queuedStatus || 'queued'
  return { status: queuedStatus, data: { id } }
}

module.exports = enqueue
