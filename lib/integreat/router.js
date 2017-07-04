const pushToQueue = async (action, queue) => {
  const timestamp = (typeof action.queue === 'boolean') ? null : action.queue
  const queueAction = Object.assign({}, action, {queue: false})
  const success = await queue(queueAction, timestamp)
  return {status: (success) ? 'queued' : 'error'}
}

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with actions, sources, types, workers, dispatch, and queue
 * @returns {Promise} Promise of returned data
 */
async function router (action, {actions, sources, types, workers, dispatch, queue} = {}) {
  if (action) {
    const shouldQueueAction = action.queue && typeof queue === 'function'
    if (shouldQueueAction) {
      return pushToQueue(action, queue)
    } else if (actions) {
      const handler = actions[action.type]
      if (typeof handler === 'function') {
        return handler(action, {sources, types, workers, dispatch})
      }
    }
  }

  return {status: 'noaction'}
}

module.exports = router
