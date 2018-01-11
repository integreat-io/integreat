const fieldMapper = require('./fieldMapper')
const preparePipeline = require('../utils/preparePipeline')
const mapWithMappers = require('../utils/mapWithMappers')
const filterWithFilters = require('../utils/filterWithFilters')
const {
  compile: compilePath,
  get: getPath,
  set: setPath,
  compare: comparePath
} = require('../utils/path')

const prepareMapping = (mapping) => (typeof mapping === 'string' || Array.isArray(mapping)) ? {path: mapping} : mapping
const prepareValueDef = (key, type, mapping) => ({key, type, ...prepareMapping(mapping)})
const prepareTypeAttrs = (typeAttrs) => ({
  id: {type: 'string'},
  type: {type: 'string'},
  createdAt: {type: 'date'},
  updatedAt: {type: 'date'},
  ...typeAttrs
})

/**
 * Return item mapper object with fromSource and toSource.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, transform, and filters
 * @returns {Object} Item mapper object
 */
function mapping ({
  type = 'unset',
  source = null,
  path = null,
  attributes: attrMappings = {},
  relationships: relMappings = {},
  transform = null,
  filterFrom = null,
  filterTo = null,
  qualifier = null
} = {}, {
  transformers, filters, formatters, datatype = null
} = {}) {
  path = compilePath(path)
  qualifier = compilePath(qualifier)

  const attrTypes = prepareTypeAttrs((datatype) ? datatype.attributes : {})
  const attrMappers = Object.keys(attrMappings)
      .filter((key) => attrTypes.hasOwnProperty(key))
      .map((key) => fieldMapper(
        prepareValueDef(key, attrTypes[key].type, attrMappings[key]),
        {formatters, isRelationship: false}
      ))

  const relTypes = (datatype) ? datatype.relationships : {}
  const relMappers = Object.keys(relMappings)
      .filter((key) => relTypes.hasOwnProperty(key))
      .map((key) => fieldMapper(
        prepareValueDef(key, relTypes[key].type, relMappings[key]),
        {formatters, isRelationship: true}
      ))

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  const hasFieldMappings = (attrMappers.length > 0 || relMappers.length > 0)

  return {
    type,
    source,

    /**
     * Map data from a source with attributes and relationships.
     * @param {Object} data - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {useDefaults = false, params = {}} = {}) {
      if (!data || !datatype) {
        return []
      }
      const items = [].concat(getPath(data, path) || [])

      return items
        .map((data) => {
          if ((!hasFieldMappings && data.type !== datatype.id) || !comparePath(data, qualifier)) {
            return undefined
          }

          const item = (hasFieldMappings)
            ? [...attrMappers, ...relMappers].reduce((target, field) => field.fromSource(data, target, params), {})
            : data

          const mappedItem = datatype.cast(item, {useDefaults})
          return mapWithMappers(mappedItem, transformPipeline, /* reverse */ false, data)
        })
        .filter((item) => item !== undefined && filterWithFilters(item, filterFromPipeline))
    },

    /**
     * Map data to a source with attributes and relationships.
     * @param {Object} data - The data to map
     * @param {Object} object - The object to map to data on
     * @returns {Object} Mapped data
     */
    toSource (data, {target = {}, useDefaults = false} = {}) {
      if (data === undefined || !datatype) {
        return undefined
      }

      const typed = datatype.cast(data, {useDefaults})

      const item = (hasFieldMappings)
        ? [...attrMappers, ...relMappers].reduce((target, field) => field.toSource(typed, target), {})
        : typed

      const mappedItem = mapWithMappers(item, transformPipeline, /* reverse */ true, data)

      return (filterWithFilters(mappedItem, filterToPipeline))
        ? setPath(target, path, mappedItem)
        : null
    }
  }
}

module.exports = mapping
