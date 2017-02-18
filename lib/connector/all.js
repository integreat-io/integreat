const {fromDb} = require('../utils/db')

/**
 * Get all items from the store by type.
 * If none is found, an empty array is returned.
 * @param {Object} db - The Dbdb database to use
 * @param {string} type - Type of the items to return
 * @returns {Promise} Promise of an array of items
 */
function all (db, type) {
  // Return empty array if no type is given
  if (!type) {
    return Promise.resolve([])
  }

  // Return items by type
  return db.getView('items:by_type', {filter: type})
    .then((items) => items.map(fromDb))
}

module.exports = all
