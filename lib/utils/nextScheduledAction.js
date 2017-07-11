const later = require('later')
later.date.localTime()

const nextDate = (schedule) => {
  const dates = later.schedule(schedule).next(2)
  if (Array.isArray(dates) && dates[0]) {
    return (dates[0].getTime() > Date.now()) ? dates[0] : dates[1]
  }
  return null
}

/**
 * Create the next queuable action from an action.
 * @param {Object} action - The action to reschedule
 * @returns {object} The next action object
 */
function nextScheduledAction (action) {
  if (action.schedule) {
    try {
      const date = nextDate(action.schedule)
      if (date) {
        return Object.assign({}, action, {queue: date.getTime()})
      }
    } catch (err) {}
  }
  return null
}

module.exports = nextScheduledAction
