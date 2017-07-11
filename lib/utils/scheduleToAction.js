const later = require('later')
later.date.localTime()

const cleanSchedule = ({schedules, exceptions}) => ({schedules, exceptions})
const wrapSimpleSchedule = (schedule) => ({schedules: [].concat(schedule)})

const parseSchedule = (def) => {
  if (typeof def === 'string') {
    const schedule = later.parse.text(def)
    return (schedule.error === -1)
      ? cleanSchedule(schedule)
      : null
  } else if (def) {
    return (def.schedules || def.exceptions)
      ? cleanSchedule(def)
      : wrapSimpleSchedule(def)
  }

  return null
}

const nextTime = (schedule) => {
  try {
    const date = later.schedule(schedule).next()
    return date.getTime()
  } catch (err) {
    return null
  }
}

/**
 * Create a queuable action from a schedule definition.
 * @param {Object} scheduleDef - A schedule definition
 * @returns {object} An action object
 */
function scheduleToAction (scheduleDef = {}) {
  const schedule = parseSchedule(scheduleDef.schedule)

  let queue = scheduleDef.immediately
  if (!queue && schedule) {
    queue = nextTime(schedule)
  }

  return (queue) ? {
    type: 'RUN',
    queue,
    schedule,
    payload: scheduleDef.job
  } : null
}

module.exports = scheduleToAction
