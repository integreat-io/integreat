const debug = require('debug')('great')
const createError = require('./utils/createError')
const scheduleToAction = require('./utils/scheduleToAction')
const nextSchedule = require('./utils/nextSchedule')

const prepareMetaForQueue = ({queue, ...rest}) => ({
  ...rest,
  queuedAt: Date.now()
})
const prepareForQueue = (action) => ({
  ...action,
  meta: prepareMetaForQueue(action.meta)
})

const enqueue = async (queue, action) => {
  const {meta} = action
  const queuedAction = prepareForQueue(action)
  const timestamp = (typeof meta.queue === 'boolean') ? null : meta.queue
  const actionId = meta.id || null

  let id
  try {
    id = await queue.push(queuedAction, timestamp, actionId)
  } catch (error) {
    debug('Error from queue when pushing %o with timestamp %s. Error: %s', queuedAction, timestamp, error)
    return createError(`Could not push to queue. ${error}`)
  }

  debug('Pushed to queue with timestamp %s and id \'%s\': %o', timestamp, id, queuedAction)
  return {status: 'queued', data: {id}}
}

const enqueueNext = (queue, action) => {
  if (action.meta && action.meta.schedule) {
    let nextTime = null
    try {
      nextTime = nextSchedule(action.meta.schedule, true)
    } catch (error) {
      debug('Error when rescheduling action %o', action)
    }

    if (nextTime) {
      const nextAction = {...action, meta: {...action.meta, queue: nextTime.getTime()}}
      return enqueue(queue, nextAction)
    }
  }
}

/**
 * Set up Integreat queue interface.
 *
 * @param {Object} queue - A supported queue implementation
 * @returns {Object} An Integreat queue instance with setDispatch and fromDispatch methods
 */
function setupQueue (queue) {
  let dispatch = null

  queue.subscribe(async (action) => {
    if (typeof dispatch === 'function') {
      return dispatch(action)
    }
  })

  return {
    queue,

    /**
     * Set dispatch function to use for dequeuing
     */
    setDispatch (dispatchFn) {
      dispatch = dispatchFn
    },

    /**
     * Middleware interface for Integreat. Will push queuable actions to queue,
     * and pass the rest on to the next() function.
     *
     * @param {function} next - The next middleware
     * @returns {Object} A response object
     */
    fromDispatch: (next) => async (action) => {
      if (action.meta && action.meta.queue) {
        return enqueue(queue, action)
      } else {
        const response = next(action)
        enqueueNext(queue, action)
        return response
      }
    },

    /**
     * Schedule actions from the given defs.
     * Actions are enqueued with a timestamp, and are ran at the
     * set time.
     * @param {array} defs - An array of schedule definitions
     * @returns {array} Array of returned responses
     */
    async schedule (defs) {
      defs = [].concat(defs)
      debug('Schedule: %d schedules', defs.length)

      return Promise.all(
        defs.map((def) => {
          try {
            return enqueue(queue, scheduleToAction(def))
          } catch (error) {
            return createError(error)
          }
        })
      )
    }
  }
}

module.exports = setupQueue
