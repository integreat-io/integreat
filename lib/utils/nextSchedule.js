const later = require('later')

const nextDate = (dates, allowNow) => {
  if (Array.isArray(dates) && dates[0]) {
    return (allowNow || dates[0].getTime() > Date.now()) ? dates[0] : dates[1]
  }
  return null
}

/**
 * Get next time for a schedule. Will never return the current time, even if it
 * is valid for the schedule, unless `allowNow` is true.
 * @param {Object} schedule - The schedule
 * @param {boolean} allowNow - True to allow now as next Date
 * @returns {Date} The next Date
 */
function nextSchedule (schedule, allowNow = false) {
  if (schedule) {
    try {
      const dates = later.schedule(schedule).next(2)
      return nextDate(dates, allowNow)
    } catch (error) {
      throw TypeError('Invalid schedule definition')
    }
  }
  return null
}

module.exports = nextSchedule
