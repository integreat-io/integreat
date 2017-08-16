const later = require('later')

const cleanSchedule = ({schedules, exceptions}) => ({schedules, exceptions})
const wrapSimpleSchedule = (schedule) => ({schedules: [].concat(schedule)})

const parseSchedule = (def) => {
  if (typeof def === 'string') {
    const schedule = later.parse.text(def)
    if (schedule.error !== -1) {
      throw new Error('Invalid schedule')
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
 * @param {Object} scheduleDef - A schedule definition
 * @returns {object} An action object
 */
function scheduleToAction (scheduleDef) {
  if (!scheduleDef) {
    return null
  }

  const schedule = parseSchedule(scheduleDef.schedule)

  return {
    type: 'RUN',
    schedule,
    payload: scheduleDef.job
  }
}

module.exports = scheduleToAction
