import middleware from './middleware'
import schedule from './schedule'
import { Queue } from './types'
import { Dispatch } from '../types'

/**
 * Set up Integreat queue interface.
 */
function setupQueue(queue: Queue) {
  let dispatch: Dispatch | null = null
  let subscribed = false

  return {
    queue,

    /**
     * Set dispatch function to use for dequeuing
     */
    setDispatch(dispatchFn: Dispatch | null) {
      dispatch = dispatchFn

      if (!subscribed && typeof dispatch === 'function') {
        queue.subscribe(dispatch)
        subscribed = true
      }
    },

    /**
     * Middleware interface for Integreat. Will push queuable actions to queue,
     * and pass the rest on to the next() function.
     *
     */
    middleware(next: Dispatch) {
      return middleware(next, queue)
    },

    /**
     * Schedule actions from the given defs.
     * Actions are enqueued with a timestamp, and are ran at the
     * set time.
     * @param {array} defs - An array of schedule definitions
     * @returns {array} Array of returned responses
     */
    async schedule(defs) {
      return schedule(defs, queue)
    },
  }
}

export default setupQueue
