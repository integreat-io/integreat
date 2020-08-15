import debugLib = require('debug')
import nextSchedule from './nextSchedule'
import enqueue from './enqueue'
import { Queue } from './types'
import { Action, Dispatch, Response } from '../types'

const debug = debugLib('great')

const getNextTime = (action: Action) => {
  if (action.meta && action.meta.schedule) {
    try {
      return nextSchedule(action.meta.schedule, true)
    } catch (error) {
      debug('Error when rescheduling action %o', action)
    }
  }
  return null
}

const enqueueNext = (queue: Queue, action: Action) => {
  const nextTime = getNextTime(action)

  if (nextTime) {
    const nextAction = {
      ...action,
      meta: { ...action.meta, queue: nextTime.getTime() },
    }
    return enqueue(queue, nextAction)
  }
  return
}

export default function middleware(next: Dispatch, queue: Queue) {
  return async (action: Action): Promise<Response> => {
    if (action.meta && action.meta.queue) {
      return enqueue(queue, action)
    } else {
      const response = next(action)
      enqueueNext(queue, action)
      return response
    }
  }
}
