const uuid = require('uuid/v4')
const getProp = require('lodash.get')
const setProp = require('lodash.set')
const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')

const removeReserved = (attributes) => Object.keys(attributes).reduce(
  (attrs, attr) => (/^(id|(cre|upd)atedAt)$/.test(attr)) ? attrs : Object.assign(attrs, {[attr]: attributes[attr]}),
  {}
)

const getValue = (data, key) => {
  if (/^(id|type|(cre|upd)atedAt)$/.test(key)) {
    return data[key]
  } else {
    return (data.attributes) ? data.attributes[key] : null
  }
}

const mapAttributes = (attrs, data, defaultAttrs) => {
  return attrs.reduce((attributes, {key, path, fromSource}) => {
    if (key === 'type') {
      return attributes
    }
    const value = getProp(data, path)
    return Object.assign(attributes, {[key]: fromSource(value)})
  }, Object.assign({}, defaultAttrs))
}

const mapRelationships = (rels, data, defaultRels) => {
  return rels.reduce((relationships, {key, type, path, fromSource}) => {
    const value = getProp(data, path)
    const createRel = (value) => ({id: fromSource(value), type})
    const relationship = (Array.isArray(value)) ? value.map(createRel) : createRel(value)
    return Object.assign(relationships, {[key]: relationship})
  }, Object.assign({}, defaultRels))
}

const createValueMapper = (valueMappings, valueTypes, formatters, isRelationship) =>
  Object.keys(valueMappings)
    .filter((key) => valueTypes.hasOwnProperty(key))
    .map((key) => valueMapper(
      Object.assign(
        {key, type: valueTypes[key].type, default: valueTypes[key].default},
        valueMappings[key]
      ),
      {formatters, isRelationship}
    ))

const defaultTypeAttrs = {
  id: {type: 'string'},
  createdAt: {type: 'date'},
  updatedAt: {type: 'date'}
}

/**
 * Return item mapper object with fromSource and toSource.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, transform, and filters
 * @returns {Object} Item mapper object
 */
function itemMapper ({
  type = 'unset',
  path = null,
  attributes: attrMappings = {},
  relationships: relMappings = {},
  transform = null,
  filterFrom = null,
  filterTo = null
} = {}, {
  transformers, filters, formatters, type: typeDef = {}
} = {}) {
  const attrMappers = createValueMapper(
    attrMappings,
    Object.assign({}, defaultTypeAttrs, typeDef.attributes),
    formatters,
    false
  )
  const relMappers = createValueMapper(
    relMappings,
    typeDef.relationships,
    formatters,
    true
  )

  const restAttrs = Object.keys(typeDef.attributes || {}).reduce(
    (attrs, key) => Object.assign(attrs, {[key]: typeDef.attributes[key].default}
  ), {})
  const restRels = Object.keys(typeDef.relationships || {}).reduce(
    (rels, key) => Object.assign(rels, {[key]: {
      id: typeDef.relationships[key].default,
      type: typeDef.relationships[key].type
    }}
  ), {})

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  return {
    type,
    path,

    /**
     * Map data from a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} source - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {mappedValuesOnly = false} = {}) {
      if (!data) {
        return null
      }
      let item = data

      if (type !== '*') {
        const defaultAttrs = (mappedValuesOnly) ? {} : restAttrs
        const defaultRels = (mappedValuesOnly) ? {} : restRels

        const attributes = mapAttributes(attrMappers, data, defaultAttrs)
        const relationships = mapRelationships(relMappers, data, defaultRels)

        item = {
          id: attributes['id'] || uuid(),
          type,
          createdAt: attributes['createdAt'],
          updatedAt: attributes['updatedAt'],
          attributes: removeReserved(attributes),
          relationships
        }
      }

      item.createdAt = item.createdAt || item.updatedAt || new Date()
      item.updatedAt = item.updatedAt || item.createdAt

      const reverse = false
      return mapWithMappers(item, transformPipeline, reverse)
    },

    /**
     * Map data to a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} data - The data to map
     * @returns {Object} Mapped data
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
          const value = getValue(data, key)
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
      return mapWithMappers(item, transformPipeline, reverse)
    },

    /**
     * Filter an item throught the filter pipe line - from a source.
     * @param {Object} item - The item to filter
     * @returns {boolean} True if item passed all filters
     */
    filterFromSource (item) {
      return filterWithFilters(item, filterFromPipeline)
    },

    /**
     * Filter an item throught the filter pipe line - to a source.
     * @param {Object} item - The item to filter
     * @returns {boolean} True if item passed all filters
     */
    filterToSource (item) {
      return filterWithFilters(item, filterToPipeline)
    }
  }
}

module.exports = itemMapper
