const mapWithMappers = require('../utils/mapWithMappers')

/**
 * Map an attribute value.
 * @param {Object} value - The source value to map from
 * @param {Object} defaultValue - The value to use if source value is null or undefined
 * @param {array} mappers - Array of mappers (map function or map objects)
 * @returns {Object} Target value
 */
module.exports = function mapAttribute (value, defaultValue, mappers) {
  // Return default value if value is not given
  if (value === null || value === undefined) {
    return defaultValue
  }

  // Map and return
  return mapWithMappers(value, mappers)
}
