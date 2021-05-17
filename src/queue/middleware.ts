import enqueue from './enqueue'
import { Queue } from '.'
import { Action, InternalDispatch } from '../types'

export default function middleware(next: InternalDispatch, queue: Queue) {
  return async (action: Action): Promise<Action> => {
    if (action.meta?.queue) {
      return enqueue(queue, action)
    } else {
      const responseAction = await next(action)
      return responseAction
    }
  }
}
