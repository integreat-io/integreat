const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')
const {get: getPath, set: setPath, compile: compilePath} = require('../../utils/path')

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
  relationships[key] = (param) ? params[param] : getPath(data, path)
  return relationships
}

const assembleValueObject = (key, {type, default: def} = {}, mapping) =>
  Object.assign(
    {key, type, default: def},
    (typeof mapping === 'string') ? {path: mapping} : mapping
  )

const createValueMapper = (mappings, types, formatters, isRelationship) =>
  Object.keys(mappings)
    .filter((key) => types.hasOwnProperty(key))
    .map((key) => valueMapper(
      assembleValueObject(key, types[key], mappings[key]),
      {formatters, isRelationship}
    ))

const defaultTypeAttrs = {
  id: {type: 'string'},
  type: {type: 'string'},
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
  transformers, filters, formatters, datatype = null
} = {}) {
  const attrMappers = createValueMapper(
    attrMappings,
    Object.assign({}, defaultTypeAttrs, (datatype || {}).attributes),
    formatters,
    false
  )
  const relMappers = createValueMapper(
    relMappings,
    (datatype || {}).relationships,
    formatters,
    true
  )

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
    fromSource (data, {mappedValuesOnly = false, params = {}, datatype: casttype} = {}) {
      casttype = datatype || casttype
      if (!data || !casttype) {
        return null
      }
      let item = data

      if (attrMappers.length > 0 || relMappers.length > 0) {
        item = {
          attributes: attrMappers.reduce(setAttribute(data, params), {}),
          relationships: relMappers.reduce(setRelationship(data, params), {})
        }
      } else if (data.type !== casttype.id) {
        return null
      }

      item = casttype.cast(item, {useDefaults: !mappedValuesOnly})

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
