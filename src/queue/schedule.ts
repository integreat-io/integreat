const debug = require('debug')('great')
const createError = require('../utils/createError')
const scheduleToAction = require('../utils/scheduleToAction')
const enqueue = require('./enqueue')

async function schedule (defs, queue) {
  defs = [].concat(defs)
  debug('Schedule: %d schedules', defs.length)

  return Promise.all(
    defs.map((def) => {
      try {
        return enqueue(queue, scheduleToAction(def))
      } catch (error) {
        return createError(error)
      }
    })
  )
}

module.exports = schedule
