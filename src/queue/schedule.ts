import debugLib = require('debug')
import scheduleToAction from './scheduleToAction'
import enqueue from './enqueue'
import { Queue, ScheduleDef } from './types'
import { Response } from '../types'

const debug = debugLib('great')

export default async function schedule(
  defs: ScheduleDef | ScheduleDef[],
  queue: Queue
): Promise<Response[]> {
  defs = ([] as ScheduleDef[]).concat(defs)
  debug('Schedule: %d schedules', defs.length)

  return Promise.all(
    defs.map((def) => {
      try {
        const action = scheduleToAction(def)
        if (!action) {
          return {
            status: 'noaction',
            error: 'Schedule did not result in a queuable action',
          }
        }
        return enqueue(queue, action)
      } catch (error) {
        return { status: 'error', error }
      }
    })
  )
}
