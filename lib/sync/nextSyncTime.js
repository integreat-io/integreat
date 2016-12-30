/**
 * Return next sync time for the given syncDef.
 * @param {Object} syncDef - An object with sync definitions
 * @param {integer} lastSync - The timestamp of last sync
 * @returns {integer} Timestamp for next sync
 */
module.exports = function nextSyncTime (syncDef, lastSync) {
  // Return null if no sync schedule
  if (!syncDef || !syncDef.schedule) {
    return null
  }

  // Next sync time - calculated from last sync
  const nextSync = (lastSync) ? lastSync + (syncDef.schedule * 1000) : 0

  // Return latest of sync time and now
  return Math.max(nextSync, Date.now())
}
