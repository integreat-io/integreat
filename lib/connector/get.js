const {fromDb} = require('../utils/db')

/**
 * Get an item from the store. If item is not found, null is returned.
 * @param {Object} db - The Dbdb database to use
 * @param {string} id - Id of the item
 * @param {string} type - Type of the item
 * @returns {Promise} Promise of item
 */
function get (db, id, type) {
  // Return null if no id or type is given
  if (!id || !type) {
    return Promise.resolve(null)
  }

  const dbid = `${type}:${id}`

  // Get item from store
  return db.get(dbid)
    .catch((err) => {
      if (err.name === 'NotFoundError') {
        // Return null when not found
        return null
      }
      // Reject with error
      return Promise.reject(err)
    })
    .then(fromDb)
}

module.exports = get
