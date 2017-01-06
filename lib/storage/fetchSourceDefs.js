const fromDb = (item) => Object.assign({}, item, {id: item.id.substr(7)})

/**
 * Fetch all sources from the database.
 * If none is found, an empty array is returned.
 * @param {Object} db - The Dbdb database to use
 * @returns {Promise} Promise of an array of sources
 */
module.exports = function fetchSourceDefs (db) {
  return db.getView('great:sources')
    .then((items) => items.map(fromDb))
}
