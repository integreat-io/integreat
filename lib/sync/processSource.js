const fetchSource = require('./fetchSource')
const mapItem = require('./mapItem')
const debug = require('debug')('great')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {Object} sourceDef - Source definition
 * @param {function} getAdapter - Function to get adapter for the source
 * @param {Object} storage - Storage insance for storing items
 * @returns {Promise} Promise for array of items
 */
module.exports = function processSource (sourceDef, getAdapter, storage) {
  // Validate fetch definition
  if (!sourceDef) {
    debug('processSource called without a valid source definition')
    return Promise.reject(new Error('No valid source definition'))
  }

  // Validate adapter
  if (!getAdapter || typeof getAdapter !== 'function') {
    debug('processSource called without a valid adapter')
    return Promise.reject(new Error('No adapter function'))
  }

  // Break down source definition
  const {sourcetype} = sourceDef
  const fetchDef = sourceDef.fetch
  const itemDef = sourceDef.item

  // Fetch items from source
  debug('Fetching for source `%s`', sourcetype)
  return fetchSource(fetchDef, getAdapter(sourcetype))
    // Map items and return them
    .then((items) => items.map((item) => mapItem(item, itemDef)))
    .then((items) => {
      debug('Fetched %d items for source `%s`', items.length, sourcetype)
      if (storage) {
        debug('Storing items for source `%s`', sourcetype)
        return storage.storeItems(items)
      }
      return items
    })
}
