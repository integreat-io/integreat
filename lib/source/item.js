const uuid = require('uuid/v4')
const dotProp = require('dot-prop')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')

const getToValue = (data, key) => {
  if (/^(id|(cre|upd)atedAt)$/.test(key)) {
    return data[key]
  } else {
    return (data.attributes) ? data.attributes[key] : null
  }
}

const moveFromAttributes = (attr, attributes, defaultFn) => {
  if (attributes[attr]) {
    const value = attributes[attr]
    delete attributes[attr]
    return value
  } else {
    return defaultFn()
  }
}

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
   * Transform data from a source with attributes and relationships.
   * @param {Object} source - The source item to map from
   * @returns {Object} Target item
   */
  fromSource (source) {
    if (!source) {
      return null
    }

    const targetAttrs = {}
    this.attributes.forEach((attr) => {
      const value = dotProp.get(source, attr.path)
      targetAttrs[attr.key] = attr.fromSource(value)
    })

    const targetRels = {}
    this.relationships.forEach((rel) => {
      const value = dotProp.get(source, rel.path)
      const createRel = (value) => ({id: rel.fromSource(value), type: rel.type})
      targetRels[rel.key] = (Array.isArray(value)) ? value.map(createRel) : createRel(value)
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

    const reverse = false
    return mapWithMappers(target, this.map, reverse)
  }

  /**
   * Transform data to a source with attributes and relationships.
   * @param {Object} data - The data to transform
   * @returns {Object} Transformed data
   */
  toSource (data) {
    if (!data) {
      return null
    }

    const ret = {}

    this.attributes.forEach((attr) => {
      const value = getToValue(data, attr.key)
      const transformedValue = attr.toSource(value)
      dotProp.set(ret, attr.path, transformedValue)
    })

    this.relationships.forEach((rel) => {
      const relation = (data.relationships) ? data.relationships[rel.key] : null
      if (relation) {
        const value = (Array.isArray(relation))
          ? relation.map((val) => val.id)
          : relation.id

        const transformedValue = rel.toSource(value)
        dotProp.set(ret, rel.path, transformedValue)
      }
    })

    const reverse = true
    return mapWithMappers(ret, this.map, reverse)
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
