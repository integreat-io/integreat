const uuid = require('uuid/v4')
const getProp = require('lodash.get')
const setProp = require('lodash.set')
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

const createValuesFromParams = (paramsArr) => paramsArr.map((params) => valueMapper(params))

const mapAttributes = (attrs, data) => {
  return attrs.reduce((attributes, {key, path, fromSource}) => {
    if (key === 'type') {
      return attributes
    }
    const value = getProp(data, path)
    return Object.assign(attributes, {[key]: fromSource(value)})
  }, {})
}

const mapRelationships = (rels, data) => {
  return rels.reduce((relationships, {key, type, path, fromSource}) => {
    const value = getProp(data, path)
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
  attributes: attrParams = [],
  relationships: relParams = [],
  map = null,
  filterFrom = null,
  filterTo = null,
  defaultAttributes = {}
} = {}) {
  const attrMappers = createValuesFromParams(attrParams)
  const relMappers = createValuesFromParams(relParams)

  return {
    type,
    path,

    /**
     * Transform data from a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} source - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data) {
      if (!data) {
        return null
      }
      let item = data

      if (type !== '*') {
        const attributes = mapAttributes(attrMappers, data)
        item = {
          id: attributes['id'] || uuid(),
          type,
          createdAt: attributes['createdAt'],
          updatedAt: attributes['updatedAt'],
          attributes: removeReserved(attributes),
          relationships: mapRelationships(relMappers, data)
        }
      }

      item.createdAt = item.createdAt || new Date()
      item.updatedAt = item.updatedAt || item.createdAt

      const reverse = false
      return mapWithMappers(item, map, reverse)
    },

    /**
     * Transform data to a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
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
        attrMappers.forEach(({key, path, toSource}) => {
          const value = getToValue(data, key)
          setProp(item, path, toSource(value))
        })

        relMappers.forEach(({key, path, toSource}) => {
          if (data.relationships && data.relationships[key]) {
            const rel = data.relationships[key]
            const value = (Array.isArray(rel)) ? rel.map((val) => val.id) : rel.id
            setProp(item, path, toSource(value))
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
