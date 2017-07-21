const nextSchedule = require('../utils/nextSchedule')
const getSource = require('../utils/getSource')

const queueAction = async (action, pushToQueue) => {
  const timestamp = (typeof action.queue === 'boolean') ? null : action.queue
  const queueAction = Object.assign({}, action, {queue: false})
  const success = await pushToQueue(queueAction, timestamp)
  return {status: (success) ? 'queued' : 'error'}
}

const callHandler = (action, actions, resources) => {
  const handler = actions[action.type]
  if (typeof handler === 'function') {
    return handler(action.payload, resources)
  }
  return {status: 'noaction'}
}

const callAction = async (action, actions, pushToQueue, resources) => {
  const ret = await callHandler(action, actions, resources)
  if (action.schedule && pushToQueue) {
    const nextTime = nextSchedule(action.schedule)
    if (nextTime) {
      pushToQueue(action, nextTime)
    }
  }
  return ret
}

/**
 * Routes the action to the relevant action handler and the relevant source.
 * If a payload includes type but no source, the correct source is added.
 * @param {Object} action - The action to route
 * @param {Object} resources - Object with actions, datatypes, sources, workers, dispatch, and pushToQueue
 * @returns {Promise} Promise of returned data
 */
async function router (action, {actions, datatypes, sources, workers, dispatch, pushToQueue} = {}) {
  if (action) {
    if (action.queue && typeof pushToQueue === 'function') {
      return queueAction(action, pushToQueue)
    } else if (actions) {
      return callAction(action, actions, pushToQueue, {
        datatypes,
        sources,
        workers,
        dispatch,
        getSource: getSource(datatypes, sources)
      })
    }
  }
  return {status: 'noaction'}
}

module.exports = router
