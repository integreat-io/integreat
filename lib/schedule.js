const scheduleToAction = require('./utils/scheduleToAction')
const nextSchedule = require('./utils/nextSchedule')
const createError = require('./utils/createError')

/**
 * Schedule actions from the given defs.
 * Actions are queued with a timestamp, and are ran at the set time with the
 * worker given in the schedule definition.
 * @param {array} defs - An array of schedule definitions
 * @param {function} queue - Function for pushing to the queue
 * @returns {array} Array of returned objects from queue
 */
async function schedule (defs, queue) {
  return Promise.all(
    defs.map((def) => {
      let action = null
      let timestamp = null

      try {
        action = scheduleToAction(def)
      } catch (err) {
        return createError(`Could not schedule ${def}. ${err}`)
      }

      if (action.schedule) {
        timestamp = nextSchedule(action.schedule, true)
        if (!timestamp) {
          return createError(`Could not schedule ${def}. Invalid schedule definition`)
        }
      }

      return queue(action, timestamp)
    })
  )
}

module.exports = schedule
