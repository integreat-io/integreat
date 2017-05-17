const mapWithMappers = require('../../utils/mapWithMappers')

/** Class representing an value mapping between a source and the internal format. */
class ValueMapper {
  /**
   * Create an attribute mapping.
   * @param {string} key - The key of the value
   * @param {string} type - The type of the value
   * @param {string} path - The path in the source object
   * @param {Object} defaultFrom - Default value to use when mapping from source
   * @param {Object} defaultTo - Default value to use when mapping to source
   */
  constructor (key, type, path, defaultFrom, defaultTo) {
    this.key = key || null
    this.type = type || 'string'
    this._path = path || null
    this.default = {
      from: (defaultFrom !== undefined) ? defaultFrom : null,
      to: (defaultTo !== undefined) ? defaultTo : null
    }
    this._map = []
  }

  /** Returns path. If no path, use key as path. */
  get path () {
    return this._path || this.key
  }

  /** Returns map array */
  get map () {
    return this._map
  }

  /**
   * Transform a value from a source.
   * @param {Object} value - The value to transform
   * @returns {Object} Transformed value
   */
  fromSource (value) {
    if (value === null || value === undefined) {
      return this.default.from
    }

    const reverse = false
    return mapWithMappers(value, this.map, reverse)
  }

  /**
   * Transform a value to a source.
   * @param {Object} value - The value to transform
   * @returns {Object} Transformed value
   */
  toSource (value) {
    if (value === null || value === undefined) {
      return this.default.to
    }

    const reverse = true
    return mapWithMappers(value, this.map, reverse)
  }
}

module.exports = ValueMapper
