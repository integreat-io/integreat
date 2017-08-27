const uuid = require('uuid/v4')
const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')
const {get: getPath, set: setPath, compile: compilePath} = require('../../utils/path')

const removeReserved = (attributes) => Object.keys(attributes).reduce(
  (attrs, attr) => (/^(id|(cre|upd)atedAt)$/.test(attr)) ? attrs : Object.assign(attrs, {[attr]: attributes[attr]}),
  {}
)

const getItemAttribute = (data, key) => {
  if (/^(id|type|(cre|upd)atedAt)$/.test(key)) {
    return data[key]
  } else {
    return (data.attributes) ? data.attributes[key] : null
  }
}

const setAttribute = (data, params) => (attributes, {key, path, param, fromSource}) => {
  if (key !== 'type') {
    const value = (param) ? params[param] : getPath(data, path)
    attributes[key] = fromSource(value)
  }
  return attributes
}

const setRelationship = (data, params) => (relationships, {key, type, path, param, fromSource}) => {
  const value = (param) ? params[param] : getPath(data, path)
  const createRel = (value) => ({id: fromSource(value), type})
  relationships[key] = (Array.isArray(value)) ? value.map(createRel) : createRel(value)
  return relationships
}

const assembleValueObject = (key, {type, default: def}, valueMapping) =>
  Object.assign(
    {key, type, default: def},
    (typeof valueMapping === 'string') ? {path: valueMapping} : valueMapping
  )

const createValueMapper = (valueMappings, valueTypes, formatters, isRelationship) =>
  Object.keys(valueMappings)
    .filter((key) => valueTypes.hasOwnProperty(key))
    .map((key) => valueMapper(
      assembleValueObject(key, valueTypes[key], valueMappings[key]),
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
  transformers, filters, formatters, type: typeDef = null
} = {}) {
  const attrMappers = createValueMapper(
    attrMappings,
    Object.assign({}, defaultTypeAttrs, (typeDef || {}).attributes),
    formatters,
    false
  )
  const relMappers = createValueMapper(
    relMappings,
    (typeDef || {}).relationships,
    formatters,
    true
  )

  const restAttrs = (typeDef) ? typeDef.missingAttributes(attrMappers) : {}
  const restRels = (typeDef) ? typeDef.missingRelationships(relMappers) : {}

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  return {
    type,
    path: compilePath(path),

    /**
     * Map data from a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} source - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {mappedValuesOnly = false, params = {}} = {}) {
      if (!data) {
        return null
      }
      let item = data

      if (attrMappers.length > 0 || relMappers.length > 0) {
        const attributes = attrMappers.reduce(setAttribute(data, params), {})
        const relationships = relMappers.reduce(setRelationship(data, params), {})

        item = {
          id: attributes['id'],
          createdAt: attributes['createdAt'],
          updatedAt: attributes['updatedAt'],
          attributes: removeReserved(attributes),
          relationships
        }
      }

      item.id = item.id || uuid()
      item.type = item.type || type
      item.createdAt = item.createdAt || item.updatedAt || new Date()
      item.updatedAt = item.updatedAt || item.createdAt

      if (!mappedValuesOnly) {
        item.attributes = Object.assign({}, restAttrs, item.attributes)
        item.relationships = Object.assign({}, restRels, item.relationships)
      }

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

      if (attrMappers.length === 0 && relMappers.length === 0) {
        item = data
      } else {
        attrMappers.forEach(({key, path, toSource}) => {
          const value = getItemAttribute(data, key)
          item = setPath(item, path, toSource(value))
        })

        relMappers.forEach(({key, path, toSource}) => {
          if (data.relationships && data.relationships[key]) {
            const rel = data.relationships[key]
            const value = (Array.isArray(rel)) ? rel.map((val) => val.id) : rel.id
            item = setPath(item, path, toSource(value))
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
