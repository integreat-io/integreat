const retrieveFromPath = require('../utils/retrieveFromPath')

/**
 * Retrieve, parse, and transform a source. Returns an array of items.
 * @param {Object} great - The current great instance
 * @param {Object} sourceDef - An object with source definitions
 * @returns {Array} Source items
 */
module.exports = function retrieveSource (great, sourceDef) {
  const {type, endpoint, path, transform, filter} = sourceDef

  // Get adapter from source type
  const adapter = great.getAdapter(type)

  // Get source data
  const source = adapter.retrieve(endpoint)

  // Retrieve items from path in source object
  let items = retrieveFromPath(source, path)

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
}
