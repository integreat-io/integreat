const dotProp = require('dot-prop')

/**
 * Retrieves the value at a dot notated path in the given item
 * @param {Object} item - The item to retrieve value from
 * @param {string} path - The dot notated path
 * @returns {Object} Value
 */
module.exports = function retrieveFromPath (item, path) {
  return dotProp.get(item, (path === '') ? null : path)
}
