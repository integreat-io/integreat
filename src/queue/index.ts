import middleware from './middleware'
import { Dispatch, InternalDispatch } from '../types'
import { Action, Response } from '../types'

// TODO: This is the most correct typing, but how to open for cases where we
// listen for non-actions and returns other types of objects?
export interface JobHandler {
  (data: Action): Promise<Response>
}

export interface Queue<Q = unknown> {
  queue: Q
  namespace: string
  push: (
    payload: Action,
    timestamp?: number,
    id?: string
  ) => Promise<string | number | null>
  subscribe: (handler: JobHandler) => Promise<unknown>
  unsubscribe: (handle: unknown) => Promise<void>
  clean: (ms: number) => Promise<unknown>
  flush: () => Promise<unknown[]>
  close: () => Promise<void>
}

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
  }
}
