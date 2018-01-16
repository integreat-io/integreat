const debug = require('debug')('great')
const createError = require('./utils/createError')

const prepareMetaForQueue = ({queue, ...rest}) => ({
  ...rest,
  queuedAt: Date.now()
})
const prepareForQueue = (action) => ({
  ...action,
  meta: prepareMetaForQueue(action.meta)
})

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
      const {meta} = action

      if (meta && meta.queue) {
        const queuedAction = prepareForQueue(action)
        const timestamp = (meta.queue === true) ? null : meta.queue
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
      } else {
        return next(action)
      }
    }
  }
}

module.exports = setupQueue
