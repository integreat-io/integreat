const mapWithMappers = require('../../utils/mapWithMappers')

/**
 * Return a value mapper object, with fromSource and toSource methods.
 * @param {Ojbect} params - Name params: key, type, path, and map
 * @returns {Object} Value mapper object
 */
function valueMapper ({key = null, type = 'string', path = null, defaultTo = null, transform = null} = {}) {
  return {
    key,
    type,
    path: path || key,

    /**
     * Transform a value from a source.
     * @param {Object} value - The value to transform
     * @returns {Object} Transformed value
     */
    fromSource (value = null) {
      const reverse = false
      return (transform) ? mapWithMappers(value, transform, reverse) : value
    },

    /**
     * Transform a value to a source.
     * @param {Object} value - The value to transform
     * @returns {Object} Transformed value
     */
    toSource (value = null) {
      if (value === null) {
        return defaultTo
      }

      const reverse = true
      return (transform) ? mapWithMappers(value, transform, reverse) : value
    }
  }
}

module.exports = valueMapper
