const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const {compile: compilePath} = require('../../utils/path')

/**
 * Return a value mapper object, with fromSource and toSource methods.
 * @param {Object} def - Value definition with key, type, path, default, and format
 * @param {Object} params - Object with formatters and isRelationship
 * @param {boolean} isRelationship - True if value is relationship
 * @returns {Object} Value mapper object
 */
function valueMapper (
  {key = null, type, path = null, param = null, default: defaultValue = null, format = []} = {},
  {formatters, isRelationship = false} = {}
) {
  if (!type) {
    if (isRelationship) {
      type = key
    } else {
      type = (/(cre|upd)atedAt/.test(key)) ? 'date' : 'string'
    }
  }

  format = (isRelationship) ? format : [].concat(format, type)
  const formatPipeline = preparePipeline(format, formatters)

  return {
    key,
    type,
    path: compilePath(path || key),
    param,

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
      return mapWithMappers(value, formatPipeline, reverse)
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
      return mapWithMappers(value, format, reverse)
    }
  }
}

module.exports = valueMapper
