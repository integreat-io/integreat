const fetchSource = require('./fetchSource')
const mapItem = require('./mapItem')
const debug = require('debug')('great')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {Object} source - Source object
 * @param {Object} storage - Storage insance for storing items
 * @returns {Promise} Promise for array of items
 */
module.exports = function processSource (source, storage) {
  // Validate fetch definition
  if (!source) {
    debug('processSource called without a valid source')
    return Promise.reject(new Error('No valid source definition'))
  }

  // Validate adapter
  if (!source.adapter) {
    debug('processSource called without a valid adapter')
    return Promise.reject(new Error('No adapter function'))
  }

  // Fetch items from source
  const {itemtype, fetch} = source
  debug('Fetching for source `%s`', itemtype)

  return fetchSource(
    fetch.endpoint,
    fetch.path,
    source.adapter,
    fetch.auth,
    fetch.map,
    fetch.filter
  )
    // Map and filter items and return them
    .then((items) => items.map((item) => mapWithMappers(
      mapItem(
        item,
        itemtype,
        source.attributes,
        source.relationships
      ),
      source.item.map)
    ))
    .then((items) => items.filter((item) => filterWithFilters(item, source.item.filter)))
    .then((items) => {
      debug('Fetched %d items for source `%s`', items.length, itemtype)
      if (storage) {
        debug('Storing items for source `%s`', itemtype)
        return storage.storeItems(items)
      }
      return items
    })
}
