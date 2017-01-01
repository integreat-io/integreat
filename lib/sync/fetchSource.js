const debug = require('debug')('great:fetch')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')

/**
 * Retrieve, normalize, map, and filter a source. Returns an array of items.
 * @param {Object} great - The current great instance
 * @param {Object} sourceDef - An object with source definitions
 * @param {Object} adapter - An adapter object matching the source
 * @returns {Promise} Promise of array of source items
 */
module.exports = function fetchSource (sourceDef, adapter) {
  const {endpoint, path, map, filter} = sourceDef

  debug('Fetching from endpoint `%s`', endpoint)

  // Get source data
  return adapter.retrieve(endpoint)

  // Normalize items from path in source object
  .then((source) => adapter.normalize(source, path))

  .then((items) => {
    if (!Array.isArray(items)) {
      debug('Fetched 0 items from endpoint `%s`', endpoint)
      return []
    }

    debug('Got %d items from endpoint `%s`', items.length, endpoint)

    // Transform each item
    items = items.map((item) => mapWithMappers(item, map))
    debug('Mapped %d items from endpoint `%s`', items.length, endpoint)

    // Filter source items
    items = items.filter((item) => filterWithFilters(item, filter))
    debug('Filtered %d items from endpoint `%s`', items.length, endpoint)

    // Return source items
    debug('Fetched %d items from endpoint `%s`', items.length, endpoint)
    return items
  })
}
