const nextSyncTime = require('./nextSyncTime')
const debug = require('debug')('great')

/**
 * Add source to scheduler at next sync time.
 * @param {Object} scheduler - Scheduler to add to
 * @param {Object} sourceDef - The sourceDef representing the source to sync
 * @returns {void}
 */
module.exports = function scheduleSource (scheduler, sourceDef) {
  // Validate arguments. Do nothing if no sync schedule is defined
  if (!scheduler || !sourceDef || !sourceDef.sync || !sourceDef.sync.schedule) {
    debug('scheduleSource called with missing arguments')
    return
  }

  // Get next sync time and set it on sourceDef
  const lastSync = sourceDef.nextSync
  const nextSync = nextSyncTime(sourceDef.sync, lastSync)
  const nextSourceDef = Object.assign({}, sourceDef, {nextSync})
  const nextSyncDate = new Date(nextSync)

  // Schedule source
  scheduler.schedule(nextSyncDate, nextSourceDef)
  debug('Source `%s` scheduled for %s', sourceDef.sourcetype, nextSyncDate)
}
