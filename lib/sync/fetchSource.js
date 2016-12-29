/**
 * Retrieve, parse, and transform a source. Returns an array of items.
 * @param {Object} great - The current great instance
 * @param {Object} sourceDef - An object with source definitions
 * @param {Object} adapter - An adapter object matching the source
 * @returns {Promise} Promise of array of source items
 */
module.exports = function fetchSource (sourceDef, adapter) {
  const {endpoint, path, transform, filter} = sourceDef

  // Get source data
  return adapter.retrieve(endpoint)

  // Normalize items from path in source object
  .then((source) => adapter.normalize(source, path))

  .then((items) => {
    // Transform each item
    if (transform && typeof transform === 'function') {
      items = items.map(transform)
    }

    // Filter source items
    if (filter && typeof filter === 'function') {
      items = items.filter(filter)
    }

    // Return source items
    return items
  })
}
