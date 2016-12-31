const {toDb, fromDb} = require('../utils/db')
const debug = require('debug')('great')

/**
 * Store an item in the store. The item's id and type are used as identifiers.
 * @param {Object} db - The Dbdb database to use
 * @param {Object} item - Item to store
 * @returns {Promise} Promise of item on sucess
 */
module.exports = function storeItem (db, item) {
  // Return null if no item
  if (!item) {
    debug('storeItem called with no item')
    return Promise.resolve(null)
  }

  debug('Storing item `%s`', item.id)

  // Prepare item for storing
  const dbitem = toDb(item)

  // First, try to update, in case item already exists
  return db.update(dbitem)
    .catch((err) => {
      if (err.name === 'NotFoundError') {
        // Otherwise, on not found error, insert item
        return db.insert(dbitem)
      }
      // Reject with other error
      return Promise.reject(err)
    })
    .then((item) => {
      debug('Stored item `%s`', item.id)
      return fromDb(item)
    })
}