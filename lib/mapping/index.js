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

const completeShortForm = (mapping) => (typeof mapping === 'string' || Array.isArray(mapping)) ? {path: mapping} : mapping
const completeAttrTypes = (attrTypes) => ({
  id: {type: 'string'},
  type: {type: 'string'},
  createdAt: {type: 'date'},
  updatedAt: {type: 'date'},
  ...attrTypes
})

/**
 * Return item mapper object with fromSource and toSource.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, transform, and filters
 * @returns {Object} Item mapper object
 */
function mapping ({
  id = null,
  type,
  source = null,
  path = null,
  attributes: attrMappings = {},
  relationships: relMappings = {},
  transform = null,
  filterFrom = null,
  filterTo = null,
  qualifier = null
}, {
  transformers, filters, formatters, datatypes = {}
} = {}) {
  if (!type) {
    throw new TypeError('Can\'t create mapping without type')
  }
  const datatype = datatypes[type]
  if (!datatype) {
    throw new TypeError(`Can't create mapping with unknown type '${type}'`)
  }

  path = compilePath(path)
  qualifier = compilePath(qualifier)

  const setupMapping = (mappings, types, isRelationship) => Object.keys(mappings)
      .filter((key) => types.hasOwnProperty(key))
      .map((key) => fieldMapper(
        ({key, type: types[key].type, ...completeShortForm(mappings[key])}),
        {formatters, isRelationship}
      ))

  const mappings = [
    ...setupMapping(attrMappings, completeAttrTypes(datatype.attributes), false),
    ...setupMapping(relMappings, datatype.relationships, true)
  ]

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  return {
    id,
    type,
    source,

    /**
     * Map data from a source with attributes and relationships.
     * @param {Object} data - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {useDefaults = false, params = {}} = {}) {
      if (!data) {
        return []
      }
      const items = [].concat(getPath(data, path) || [])

      return items
        .map((data) => {
          if ((mappings.length === 0 && data.type !== datatype.id) || !comparePath(data, qualifier)) {
            return undefined
          }

          const item = (mappings.length > 0)
            ? mappings.reduce((target, field) => field.fromSource(data, target, params), {})
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
      if (data === undefined) {
        return undefined
      }

      const typed = datatype.cast(data, {useDefaults})

      const item = (mappings.length > 0)
        ? mappings.reduce((target, field) => field.toSource(typed, target), {})
        : typed

      const mappedItem = mapWithMappers(item, transformPipeline, /* reverse */ true, data)

      return (filterWithFilters(mappedItem, filterToPipeline))
        ? setPath(target, path, mappedItem)
        : null
    }
  }
}

module.exports = mapping
