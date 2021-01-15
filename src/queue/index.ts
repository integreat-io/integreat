/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import middleware from './middleware'
import schedule from './schedule'
import { Queue, ScheduleDef } from './types'
import { Dispatch, InternalDispatch } from '../types'

/**
 * Set up Integreat queue interface.
 */
export default function createQueue(queue: Queue) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handle: any = null
  return {
    queue,

    /**
     * Set dispatch function to use for dequeuing
     */
    async setDispatch(dispatch: Dispatch | null) {
      if (typeof dispatch === 'function') {
        handle = await queue.subscribe(dispatch) // Should we also unsubscribe from any existing handle?
      } else if (dispatch === null) {
        await queue.unsubscribe(handle)
      }
    },

    /**
     * Middleware interface for Integreat. Will push queuable actions to queue,
     * and pass the rest on to the next() function.
     *
     */
    middleware(next: InternalDispatch) {
      return middleware(next, queue)
    },

    /**
     * Schedule actions from the given defs.
     * Actions are enqueued with a timestamp, and are ran at the
     * set time.
     */
    async schedule(defs: ScheduleDef | ScheduleDef[]) {
      return schedule(defs, queue)
    },
  }
}
