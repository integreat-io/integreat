const later = require('later')
later.date.localTime()

/**
 * Create the next queuable action from an action.
 * @param {Object} action - The action to reschedule
 * @returns {object} The next action object
 */
function nextScheduledAction (action) {
  if (action.schedule) {
    try {
      const nextDate = later.schedule(action.schedule).next()
      if (nextDate) {
        return Object.assign({}, action, {queue: nextDate.getTime()})
      }
    } catch (err) {}
  }
  return null
}

module.exports = nextScheduledAction
