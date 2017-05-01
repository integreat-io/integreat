const uuid = require('uuid/v4')
const dotProp = require('dot-prop')
const mapWithMappers = require('./utils/mapWithMappers')
const filterWithFilters = require('./utils/filterWithFilters')

const getToValue = (data, key) => {
  if (/^(id|type|(cre|upd)atedAt)$/.test(key)) {
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

/** Class representing an item mapping between a source and the internal format. */
class ItemMapper {
  /**
   * Create an item mapping.
   * @param {string} type - The type of the target item
   * @param {string} path - The path in the source object for this item
   */
  constructor (type = ItemMapper.defaultType, path = null) {
    this.type = type
    this.path = path
    this._map = []
    this._filters = {from: [], to: []}
    this._attrMappers = []
    this._relMappers = []
  }

  /** Return map pipeline */
  get map () {
    return this._map
  }

  /** Return filter pipeline */
  get filters () {
    return this._filters
  }

  /** Return attribute mappers array */
  get attrMappers () {
    return this._attrMappers
  }

  /** Return relationship mappers array */
  get relMappers () {
    return this._relMappers
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

    const attributes = {}
    this.attrMappers.forEach((map) => {
      if (map.key !== 'type') {
        const value = dotProp.get(source, map.path)
        attributes[map.key] = map.fromSource(value)
      }
    })

    const relationships = {}
    this.relMappers.forEach((map) => {
      const value = dotProp.get(source, map.path)
      const createRel = (value) => ({id: map.fromSource(value), type: map.type})
      relationships[map.key] = (Array.isArray(value)) ? value.map(createRel) : createRel(value)
    })

    const createdAt = moveFromAttributes('createdAt', attributes, () => new Date())
    const item = {
      id: moveFromAttributes('id', attributes, () => uuid()),
      type: this.type,
      createdAt,
      updatedAt: moveFromAttributes('updatedAt', attributes, () => createdAt),
      attributes,
      relationships
    }

    const reverse = false
    return mapWithMappers(item, this.map, reverse)
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

    const item = {}

    this.attrMappers.forEach((map) => {
      const value = getToValue(data, map.key)
      const transformedValue = map.toSource(value)
      dotProp.set(item, map.path, transformedValue)
    })

    this.relMappers.forEach((map) => {
      const relation = (data.relationships) ? data.relationships[map.key] : null
      if (relation) {
        const value = (Array.isArray(relation))
          ? relation.map((val) => val.id)
          : relation.id

        const transformedValue = map.toSource(value)
        dotProp.set(item, map.path, transformedValue)
      }
    })

    const reverse = true
    return mapWithMappers(item, this.map, reverse)
  }

  /**
   * Filter an item throught the filter pipe line - from a source.
   * @param {Object} item - The item to filter
   * @returns {boolean} True if item passed all filters
   */
  filterFromSource (item) {
    return filterWithFilters(item, this.filters.from)
  }

  /**
   * Filter an item throught the filter pipe line - to a source.
   * @param {Object} item - The item to filter
   * @returns {boolean} True if item passed all filters
   */
  filterToSource (item) {
    return filterWithFilters(item, this.filters.to)
  }
}
ItemMapper.defaultType = 'unset'

module.exports = ItemMapper
