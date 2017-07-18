const nextSchedule = require('../utils/nextSchedule')

const pushToQueue = async (action, queue) => {
  const timestamp = (typeof action.queue === 'boolean') ? null : action.queue
  const queueAction = Object.assign({}, action, {queue: false})
  const success = await queue(queueAction, timestamp)
  return {status: (success) ? 'queued' : 'error'}
}

const callHandler = (action, actions, resources) => {
  const handler = actions[action.type]
  if (typeof handler === 'function') {
    return handler(action.payload, resources)
  }
  return {status: 'noaction'}
}

const callAction = async (action, actions, queue, resources) => {
  const ret = await callHandler(action, actions, resources)
  if (action.schedule && queue) {
    const nextTime = nextSchedule(action.schedule)
    if (nextTime) {
      queue(action, nextTime)
    }
  }
  return ret
}

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with actions, sources, datatypes, workers, dispatch, and queue
 * @returns {Promise} Promise of returned data
 */
async function router (action, {actions, sources, datatypes, workers, dispatch, queue} = {}) {
  if (action) {
    if (action.queue && typeof queue === 'function') {
      return pushToQueue(action, queue)
    } else if (actions) {
      return callAction(action, actions, queue, {sources, datatypes, workers, dispatch})
    }
  }
  return {status: 'noaction'}
}

module.exports = router
