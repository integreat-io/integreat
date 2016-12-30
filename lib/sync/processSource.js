const fetchSource = require('./fetchSource')
const mapItem = require('./mapItem')

/**
 * Fetch and return source items. If a storage instance is given, items will
 * be stored.
 * @param {function} getAdapter - Function to get adapter for the source
 * @param {Object} storage - Storage insance for storing items
 * @returns {function} Function to process a source. Accepts `sourceDef` and
 * `storage`, and returns a Promise for items
 */
module.exports = (getAdapter, storage) => (sourceDef) => {
  // Validate fetch definition
  if (!sourceDef) {
    return Promise.reject(new Error('No valid source definition'))
  }

  // Validate adapter
  if (!getAdapter || typeof getAdapter !== 'function') {
    return Promise.reject(new Error('No adapter function'))
  }

  // Break down source definition
  const {sourcetype} = sourceDef
  const fetchDef = sourceDef.fetch
  const itemDef = sourceDef.item

  // Fetch items from source
  return fetchSource(fetchDef, getAdapter(sourcetype))
    // Map items and return them
    .then((items) => items.map((item) => mapItem(item, itemDef)))
    .then((items) => {
      if (storage) {
        return storage.storeItems(items)
      }
      return items
    })
}
