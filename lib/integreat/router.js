const get = require('./actions/get')
const getAll = require('./actions/getAll')
const setNow = require('./actions/setNow')
const run = require('./actions/run')

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
 * @param {Object} resources - Object with sources, types, workers, dispatch, and queue
 * @returns {Promise} Promise of returned data
 */
async function router (action, {sources, types, workers, dispatch, queue} = {}) {
  if (action) {
    const shouldQueueAction = action.queue && typeof queue === 'function'
    if (shouldQueueAction) {
      return pushToQueue(action, queue)
    } else {
      switch (action.type) {
        case 'GET':
          return get(action, {sources, types})
        case 'GET_ALL':
          return getAll(action, {sources, types})
        case 'SET':
        case 'SET_NOW':
          return setNow(action, {sources, types})
        case 'RUN':
          return run(action, {workers, dispatch})
      }
    }
  }

  return {status: 'noaction'}
}

module.exports = router
