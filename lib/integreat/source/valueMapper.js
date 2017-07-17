const mapWithMappers = require('../../utils/mapWithMappers')

/**
 * Return a value mapper object, with fromSource and toSource methods.
 * @param {Ojbect} params - Name params: key, type, path, and map
 * @returns {Object} Value mapper object
 */
function valueMapper ({key = null, type = 'string', path = null, default: defaultValue = null, format = null} = {}) {
  return {
    key,
    type,
    path: path || key,

    /**
     * Map a value from a source.
     * @param {Object} value - The value to map
     * @returns {Object} Mapped value
     */
    fromSource (value = null) {
      if (value === null) {
        return defaultValue
      }

      const reverse = false
      return (format) ? mapWithMappers(value, format, reverse) : value
    },

    /**
     * Map a value to a source.
     * @param {Object} value - The value to map
     * @returns {Object} Mapped value
     */
    toSource (value = null) {
      if (value === null) {
        return defaultValue
      }

      const reverse = true
      return (format) ? mapWithMappers(value, format, reverse) : value
    }
  }
}

module.exports = valueMapper
