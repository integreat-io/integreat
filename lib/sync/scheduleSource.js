const nextSyncTime = require('./nextSyncTime')
const debug = require('debug')('great')

/**
 * Add source to scheduler at next sync time.
 * @param {Object} scheduler - Scheduler to add to
 * @param {Object} sourceDef - The sourceDef representing the source to sync
 * @param {integer} lastSync - Timestamp of last sync
 * @returns {void}
 */
module.exports = function scheduleSource (scheduler, sourceDef, lastSync) {
  // Validate arguments. Do nothing if no sync schedule is defined
  if (!scheduler || !sourceDef || !sourceDef.sync || !sourceDef.sync.schedule) {
    debug('scheduleSource called with missing arguments')
    return
  }

  // Get next sync time
  const nextTime = nextSyncTime(sourceDef.sync, lastSync)

  // Schedule source
  scheduler.schedule(nextTime, sourceDef)
  debug('Source `%s` scheduled for %s', sourceDef.sourcetype, new Date(nextTime))
}
