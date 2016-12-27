const fromPath = require('../../utils/retrieveFromPath')

/**
 * Normalize the source. Returns an object starting from the given path.
 * @param {Object} source - The source object
 * @param {string} path - The path to start from
 * @returns {array} Array of source items
 */
module.exports = function normalize (source, path) {
  return Promise.resolve(fromPath(source, path))
}
