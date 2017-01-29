const debug = require('debug')('great')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {Object} source - Source object
 * @param {Object} storage - Storage insance for storing items
 * @returns {Promise} Promise for array of items
 */
module.exports = function processSource (source, storage) {
  if (!source) {
    debug('processSource called without a valid source')
    return Promise.reject(new Error('No valid source definition'))
  }

  // Fetch items from source
  debug('Fetching for source `%s`', source.id)

  return source.fetchItems()
    .then((items) => {
      debug('Fetched %d items for source `%s`', items.length, source.id)
      if (storage) {
        debug('Storing items for source `%s`', source.id)
        return storage.storeItems(items)
      }
      return items
    })
}
