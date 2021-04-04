import debugLib = require('debug')
import nextSchedule from './nextSchedule'
import enqueue from './enqueue'
import { Queue } from './types'
import { Action, InternalDispatch } from '../types'

const debug = debugLib('great')

const getNextTime = (action: Action) => {
  if (action.meta?.schedule) {
    try {
      return nextSchedule(action.meta?.schedule, true)
    } catch (error) {
      debug('Error when rescheduling action %o', action)
    }
  }
  return null
}

function enqueueNext(queue: Queue, action: Action) {
  const nextTime = getNextTime(action)

  if (nextTime) {
    const nextAction = {
      ...action,
      meta: { ...action.meta, queue: nextTime.getTime() },
    }
    enqueue(queue, nextAction)
  }
}

export default function middleware(next: InternalDispatch, queue: Queue) {
  return async (action: Action): Promise<Action> => {
    if (action.meta?.queue) {
      return enqueue(queue, action)
    } else {
      const responseAction = await next(action)
      enqueueNext(queue, action)
      return responseAction
    }
  }
}
