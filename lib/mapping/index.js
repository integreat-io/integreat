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

      const mapOne = (data) => {
        if (!comparePath(data, qualifier)) {
          return undefined
        }

        let item = data
        if (attrMappers.length > 0 || relMappers.length > 0) {
          const setValue = (obj, field) =>
            ({...obj, [field.key]: field.fromSource(data, params)})
          item = {
            attributes: attrMappers.reduce(setValue, {}),
            relationships: relMappers.reduce(setValue, {})
          }
        } else if (data.type !== datatype.id) {
          return undefined
        }

        item = datatype.cast(item, {useDefaults})
        return mapWithMappers(item, transformPipeline, /* reverse */ false, data)
      }

      return items
        .map(mapOne)
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

      let item = {}
      const typed = datatype.cast(data, {useDefaults})

      if (attrMappers.length > 0 || relMappers.length > 0) {
        const {attributes, relationships} = typed

        attrMappers.forEach(({key, path, toSource}) => {
          const isRootKey = (['id', 'type'].includes(key))
          const value = (isRootKey) ? typed[key] : attributes[key]
          item = toSource(value, item)
        })

        relMappers.forEach(({key, path, toSource}) => {
          const rel = relationships[key]
          if (rel) {
            const value = (Array.isArray(rel)) ? rel.map((val) => val.id) : rel.id
            item = toSource(value, item)
          }
        })
      } else {
        item = typed
      }

      item = mapWithMappers(item, transformPipeline, /* reverse */ true, data)

      const passedFilter = filterWithFilters(item, filterToPipeline)
      return (passedFilter) ? setPath(target, path, item) : null
    }
  }
}

module.exports = mapping
