import later = require('later')
import nextSchedule from './nextSchedule'

const cleanSchedule = ({ schedules, exceptions }) => ({ schedules, exceptions })
const wrapSimpleSchedule = schedule => ({ schedules: [].concat(schedule) })

const parseStringDef = def => {
  const schedule = later.parse.text(def)
  if (schedule.error !== -1) {
    throw new Error('Invalid schedule string')
  }
  return cleanSchedule(schedule)
}

const parseSchedule = def => {
  if (typeof def === 'string') {
    return parseStringDef(def)
  } else if (def) {
    return def.schedules || def.exceptions
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
function scheduleToAction(def) {
  if (!def) {
    return null
  }

  const id = def.id || null
  const schedule = parseSchedule(def.schedule)
  const nextTime = nextSchedule(schedule, true)

  return {
    ...def.action,
    meta: {
      id,
      schedule,
      queue: nextTime ? nextTime.getTime() : true
    }
  }
}

export default scheduleToAction
