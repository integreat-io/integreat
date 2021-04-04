import debugLib = require('debug')
import scheduleToAction from './scheduleToAction'
import enqueueAction from './enqueue'
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
    defs.map(async (def) => {
      try {
        const action = scheduleToAction(def)
        if (!action) {
          return {
            status: 'noaction',
            error: 'Schedule did not result in a queuable action',
          }
        }
        return enqueueAction(queue, action).then(
          (responseAction) =>
            responseAction.response
              ? {
                  ...responseAction.response,
                  meta: { id: responseAction.meta?.id },
                }
              : { status: null } // TODO: Is this a correct response?
        )
      } catch (error) {
        return { status: 'error', error }
      }
    })
  )
}
