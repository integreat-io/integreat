const nextSyncTime = require('./nextSyncTime')

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
    return
  }

  // Get next sync time
  const nextTime = nextSyncTime(sourceDef.sync, lastSync)

  // Schedule source
  scheduler.schedule(nextTime, sourceDef)
}
