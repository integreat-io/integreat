const uuid = require('uuid/v4')
const dotProp = require('dot-prop')
const valueMapper = require('./valueMapper')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')

const removeReserved = (attributes) => Object.keys(attributes).reduce(
  (attrs, attr) => (/^(id|(cre|upd)atedAt)$/.test(attr)) ? attrs : Object.assign(attrs, {[attr]: attributes[attr]}),
  {}
)

const getToValue = (data, key) => {
  if (/^(id|type|(cre|upd)atedAt)$/.test(key)) {
    return data[key]
  } else {
    return (data.attributes) ? data.attributes[key] : null
  }
}

const createValuesFromParams = (paramsArr) => (paramsArr) ? paramsArr.map((params) => valueMapper(params)) : []

const mapAttributes = (attrs, data) => {
  return attrs.reduce((attributes, {key, path, fromSource}) => {
    if (key === 'type') {
      return attributes
    }
    const value = dotProp.get(data, path)
    return Object.assign(attributes, {[key]: fromSource(value)})
  }, {})
}

const mapRelationships = (rels, data) => {
  return rels.reduce((relationships, {key, type, path, fromSource}) => {
    const value = dotProp.get(data, path)
    const createRel = (value) => ({id: fromSource(value), type: type})
    const relationship = (Array.isArray(value)) ? value.map(createRel) : createRel(value)
    return Object.assign(relationships, {[key]: relationship})
  }, {})
}

/**
 * Return item mapper object with fromSource and toSource.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, map, and filters
 * @returns {Object} Item mapper object
 */
function itemMapper ({
  type = 'unset',
  path = null,
  attributes: attrParams,
  relationships: relParams,
  map = null,
  filterFrom = null,
  filterTo = null
} = {}) {
  const attrs = createValuesFromParams(attrParams)
  const rels = createValuesFromParams(relParams)

  return {
    type,
    path,

    /**
     * Transform data from a source with attributes and relationships.
     * @param {Object} source - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data) {
      if (!data) {
        return null
      }
      let item = data

      if (type !== '*') {
        const attributes = mapAttributes(attrs, data)
        item = {
          id: attributes['id'] || uuid(),
          type,
          createdAt: attributes['createdAt'],
          updatedAt: attributes['updatedAt'],
          attributes: removeReserved(attributes),
          relationships: mapRelationships(rels, data)
        }
      }

      item.createdAt = item.createdAt || new Date()
      item.updatedAt = item.updatedAt || item.createdAt

      const reverse = false
      return mapWithMappers(item, map, reverse)
    },

    /**
     * Transform data to a source with attributes and relationships.
     * @param {Object} data - The data to transform
     * @returns {Object} Transformed data
     */
    toSource (data) {
      if (!data) {
        return null
      }

      let item = {}

      if (type === '*') {
        item = data
      } else {
        attrs.forEach(({key, path, toSource}) => {
          const value = getToValue(data, key)
          dotProp.set(item, path, toSource(value))
        })

        rels.forEach(({key, path, toSource}) => {
          if (data.relationships && data.relationships[key]) {
            const rel = data.relationships[key]
            const value = (Array.isArray(rel)) ? rel.map((val) => val.id) : rel.id
            dotProp.set(item, path, toSource(value))
          }
        })
      }

      const reverse = true
      return mapWithMappers(item, map, reverse)
    },

    /**
     * Filter an item throught the filter pipe line - from a source.
     * @param {Object} item - The item to filter
     * @returns {boolean} True if item passed all filters
     */
    filterFromSource (item) {
      return (filterFrom) ? filterWithFilters(item, filterFrom) : true
    },

    /**
     * Filter an item throught the filter pipe line - to a source.
     * @param {Object} item - The item to filter
     * @returns {boolean} True if item passed all filters
     */
    filterToSource (item) {
      return filterWithFilters(item, filterTo)
    }
  }
}

module.exports = itemMapper
