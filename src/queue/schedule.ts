const debug = require('debug')('great')
import createError from '../utils/createError'
import scheduleToAction from '../utils/scheduleToAction'
import enqueue from './enqueue'

async function schedule(defs, queue) {
  defs = [].concat(defs)
  debug('Schedule: %d schedules', defs.length)

  return Promise.all(
    defs.map(def => {
      try {
        return enqueue(queue, scheduleToAction(def))
      } catch (error) {
        return createError(error)
      }
    })
  )
}

export default schedule
