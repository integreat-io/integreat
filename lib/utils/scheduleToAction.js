const later = require('later')
const nextSchedule = require('./nextSchedule')

const cleanSchedule = ({schedules, exceptions}) => ({schedules, exceptions})
const wrapSimpleSchedule = (schedule) => ({schedules: [].concat(schedule)})

const parseSchedule = (def) => {
  if (typeof def === 'string') {
    const schedule = later.parse.text(def)
    if (schedule.error !== -1) {
      throw new Error('Invalid schedule string')
    }
    return cleanSchedule(schedule)
  } else if (def) {
    return (def.schedules || def.exceptions)
      ? cleanSchedule(def)
      : wrapSimpleSchedule(def)
  }

  return null
}

/**
 * Create a queuable action from a schedule definition.
 * @param {Object} def - A schedule definition
 * @returns {object} An action object
 */
function scheduleToAction (def) {
  if (!def) {
    return null
  }

  const id = def.id || null
  const schedule = parseSchedule(def.schedule)
  const nextTime = nextSchedule(schedule, true)

  return {
    type: 'RUN',
    payload: def.job,
    meta: {
      id,
      schedule,
      queue: (nextTime) ? nextTime.getTime() : true
    }
  }
}

module.exports = scheduleToAction
