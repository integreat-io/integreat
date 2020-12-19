import debugLib = require('debug')
import nextSchedule from './nextSchedule'
import enqueue from './enqueue'
import { Queue } from './types'
import { Exchange, InternalDispatch } from '../types'

const debug = debugLib('great')

const getNextTime = (exchange: Exchange) => {
  if (exchange.meta.schedule) {
    try {
      return nextSchedule(exchange.meta.schedule, true)
    } catch (error) {
      debug('Error when rescheduling exchange %o', exchange)
    }
  }
  return null
}

function enqueueNext(queue: Queue, exchange: Exchange) {
  const nextTime = getNextTime(exchange)

  if (nextTime) {
    const nextExchange = {
      ...exchange,
      meta: { ...exchange.meta, queue: nextTime.getTime() },
    }
    enqueue(queue, nextExchange)
  }
}

export default function middleware(next: InternalDispatch, queue: Queue) {
  return async (exchange: Exchange): Promise<Exchange> => {
    if (exchange.meta && exchange.meta.queue) {
      return enqueue(queue, exchange)
    } else {
      const response = await next(exchange)
      enqueueNext(queue, exchange)
      return response
    }
  }
}
