const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const {compile: compilePath, get: getPath, set: setPath} = require('../../utils/path')

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

  path = compilePath(path || key)

  format = (isRelationship) ? format : [].concat(format, type)
  const formatPipeline = preparePipeline(format, formatters)

  return {
    key,
    type,

    /**
     * Map a value from a source.
     * @param {Object} data - The data to map from
     * @returns {Object} Mapped value
     */
    fromSource (data = {}, params = {}) {
      if (key === 'type') {
        return undefined
      }
      const value = (param) ? params[param] : getPath(data, path)
      if (value === undefined) {
        return value
      }

      const reverse = false
      return mapWithMappers(value, formatPipeline, reverse)
    },

    /**
     * Map a value to a source.
     * @param {Object} value - The value to map
     * @param {Object} object - The object to map to
     * @returns {Object} Mapped object
     */
    toSource (value, object = {}) {
      if (value === undefined) {
        return object
      }

      const reverse = true
      value = mapWithMappers(value, format, reverse)
      return setPath(object, path, value)
    }
  }
}

module.exports = valueMapper
