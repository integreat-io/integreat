const mapWithMappers = require('../../utils/mapWithMappers')

/** Class representing an attribute mapping between a source and the target. */
class Attribute {
  /**
   * Create an attribute mapping.
   * @param {string} key - The key of the target attribute
   * @param {string} type - The type of the target attribute
   * @param {string} path - The path in the source object for this attribute
   * @param {Object} defaultValue - A default value to be used if mapping null or undefined
   */
  constructor (key, type, path, defaultValue) {
    this.key = key || null
    this.type = type || 'string'
    this.path = path || null
    this.defaultValue = (defaultValue !== undefined) ? defaultValue : null
    this._map = []
  }

  /** Returns map array */
  get map () {
    return this._map
  }

  /**
   * Map a source attribute to a target attribute.
   * @param {Object} source - The source attribute to map from
   * @returns {Object} Target attribute
   */
  mapAttribute (source) {
    if (source === null || source === undefined) {
      return this.defaultValue
    }

    return mapWithMappers(source, this.map)
  }
}

module.exports = Attribute
