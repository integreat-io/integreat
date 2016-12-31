const debug = require('debug')('great')

/**
 * Retrieve, parse, and transform a source. Returns an array of items.
 * @param {Object} great - The current great instance
 * @param {Object} sourceDef - An object with source definitions
 * @param {Object} adapter - An adapter object matching the source
 * @returns {Promise} Promise of array of source items
 */
module.exports = function fetchSource (sourceDef, adapter) {
  const {endpoint, path, transform, filter, sourcetype} = sourceDef

  debug('Fetching from source `%s`', sourcetype)

  // Get source data
  return adapter.retrieve(endpoint)

  // Normalize items from path in source object
  .then((source) => adapter.normalize(source, path))

  .then((items) => {
    debug('Got %d items from source `%s`', items.length, sourcetype)

    // Transform each item
    if (transform && typeof transform === 'function') {
      debug('Transforming items from source `%s`', sourcetype)
      items = items.map(transform)
    }

    // Filter source items
    if (filter && typeof filter === 'function') {
      debug('Filtering items from source `%s`', sourcetype)
      items = items.filter(filter)
    }

    // Return source items
    debug('Fetched %d items from source `%s`', items.lenght, sourcetype)
    return items
  })
}
