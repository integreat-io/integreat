const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')
const {compile: compilePath} = require('../../utils/path')

const prepareMapping = (mapping) => (typeof mapping === 'string') ? {path: mapping} : mapping
const prepareValueDef = (key, type, mapping) => Object.assign({key, type}, prepareMapping(mapping))
const prepareTypeAttrs = (typeAttrs) => Object.assign(
  {
    id: {type: 'string'},
    type: {type: 'string'},
    createdAt: {type: 'date'},
    updatedAt: {type: 'date'}
  },
  typeAttrs
)

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
  const attrTypes = prepareTypeAttrs((datatype) ? datatype.attributes : {})
  const attrMappers = Object.keys(attrMappings)
      .filter((key) => attrTypes.hasOwnProperty(key))
      .map((key) => valueMapper(
        prepareValueDef(key, attrTypes[key].type, attrMappings[key]),
        {formatters, isRelationship: false}
      ))

  const relTypes = (datatype) ? datatype.relationships : {}
  const relMappers = Object.keys(relMappings)
      .filter((key) => relTypes.hasOwnProperty(key))
      .map((key) => valueMapper(
        prepareValueDef(key, relTypes[key].type, relMappings[key]),
        {formatters, isRelationship: true}
      ))

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
     * @param {Object} data - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {useDefaults = true, params = {}, datatype: casttype} = {}) {
      casttype = datatype || casttype
      if (!data || !casttype) {
        return null
      }
      let item = data

      if (attrMappers.length > 0 || relMappers.length > 0) {
        const setValue = (obj, {key, fromSource}) => {
          obj[key] = fromSource(data, params)
          return obj
        }

        item = {
          attributes: attrMappers.reduce(setValue, {}),
          relationships: relMappers.reduce(setValue, {})
        }
      } else if (data.type !== casttype.id) {
        return null
      }

      item = casttype.cast(item, {useDefaults})

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
        const {attributes = {}, relationships = {}} = data

        attrMappers.forEach(({key, path, toSource}) => {
          const isPropKey = (/^(id|type|(cre|upd)atedAt)$/.test(key))
          const value = (isPropKey) ? data[key] : attributes[key]
          item = toSource(value, item)
        })

        relMappers.forEach(({key, path, toSource}) => {
          const rel = relationships[key]
          if (rel) {
            const value = (Array.isArray(rel)) ? rel.map((val) => val.id) : rel.id
            item = toSource(value, item)
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
