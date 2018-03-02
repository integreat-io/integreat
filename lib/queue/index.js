const fromDispatch = require('./fromDispatch')
const schedule = require('./schedule')

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
    fromDispatch (next) {
      return fromDispatch(next, queue)
    },

    /**
     * Schedule actions from the given defs.
     * Actions are enqueued with a timestamp, and are ran at the
     * set time.
     * @param {array} defs - An array of schedule definitions
     * @returns {array} Array of returned responses
     */
    async schedule (defs) {
      return schedule(defs, queue)
    }
  }
}

module.exports = setupQueue
