const debug = require('debug')('great')

/**
 * Add source to scheduler at next sync time.
 * @param {Object} scheduler - Scheduler to add to
 * @param {Object} source - The Source object representing the source to sync
 * @returns {void}
 */
module.exports = function scheduleSource (scheduler, source) {
  // Validate arguments. Do nothing if no sync schedule is defined
  if (!scheduler || !source || !source.schedule) {
    debug('scheduleSource called with missing arguments')
    return
  }

  // Get next sync time and set it on sourceDef
  const nextSync = source.setNextSync()
  const nextSyncDate = new Date(nextSync)

  // Schedule source
  scheduler.schedule(nextSyncDate, source)
  debug('Source `%s` scheduled for %s', source.id, nextSyncDate)
}
