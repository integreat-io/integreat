const uuid = require('uuid/v4')
const dotProp = require('dot-prop')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')

const moveFromAttributes = (attr, attributes, defaultFn) => {
  if (attributes[attr]) {
    const value = attributes[attr]
    delete attributes[attr]
    return value
  } else {
    return defaultFn()
  }
}

const mapRelationship = (rel, value) => ({
  id: rel.mapAttribute(value),
  type: rel.type
})

/** Class representing an item mapping between a source and the target. */
class Item {
  /**
   * Create an item mapping.
   * @param {string} type - The type of the target item
   * @param {string} path - The path in the source object for this item
   */
  constructor (type = Item.defaultType, path = null) {
    this.type = type
    this.path = path
    this._map = []
    this._filter = []
    this._attributes = []
    this._relationships = []
  }

  /** Return map pipeline */
  get map () {
    return this._map
  }

  /** Return filter pipeline */
  get filter () {
    return this._filter
  }

  /** Return attributes array */
  get attributes () {
    return this._attributes
  }

  /** Return relationships array */
  get relationships () {
    return this._relationships
  }

  /**
   * Map a source item to a target item with attributes and relationships.
   * @param {Object} source - The source item to map from
   * @returns {Object} Target item
   */
  mapItem (source) {
    if (!source) {
      return null
    }

    const targetAttrs = {}
    this.attributes.forEach((attr) => {
      const value = dotProp.get(source, attr.path)
      targetAttrs[attr.key] = attr.mapAttribute(value)
    })

    const targetRels = {}
    this.relationships.forEach((rel) => {
      const value = dotProp.get(source, rel.path)
      targetRels[rel.key] = (Array.isArray(value))
        ? value.map((val) => mapRelationship(rel, val))
        : mapRelationship(rel, value)
    })

    const createdAt = moveFromAttributes('createdAt', targetAttrs, () => new Date())
    const target = {
      id: moveFromAttributes('id', targetAttrs, () => uuid()),
      type: this.type,
      createdAt,
      updatedAt: moveFromAttributes('updatedAt', targetAttrs, () => createdAt),
      attributes: targetAttrs,
      relationships: targetRels
    }

    return mapWithMappers(target, this.map)
  }

  /**
   * Filter a source item throught the filter pipe line.
   * @param {Object} source - The source item to filter
   * @returns {boolean} True if source passed all filters
   */
  filterItem (source) {
    return filterWithFilters(source, this.filter)
  }
}
Item.defaultType = 'unset'

module.exports = Item
