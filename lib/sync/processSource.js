const debug = require('debug')('great')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {Object} source - Source object
 * @param {Object} connector - Connector for storing items
 * @returns {Promise} Promise for array of items
 */
module.exports = function processSource (source, connector) {
  if (!source) {
    debug('processSource called without a valid source')
    return Promise.reject(new Error('No valid source definition'))
  }

  // Fetch items from source
  debug('Fetching for source `%s`', source.id)

  return source.fetchItems(source.fetch.endpoint)
    .then((items) => {
      debug('Fetched %d items for source `%s`', items.length, source.id)
      if (connector) {
        debug('Storing items for source `%s`', source.id)
        return Promise.all(items.map((item) => connector.set(item)))
      }
      return items
    })
}
