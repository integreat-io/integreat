const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')
const {
  compile: compilePath,
  get: getPath,
  set: setPath,
  compare: comparePath
} = require('../../utils/path')

const prepareMapping = (mapping) => (typeof mapping === 'string' || Array.isArray(mapping)) ? {path: mapping} : mapping
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

    /**
     * Map data from a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} data - The source item to map from
     * @returns {Object} Target item
     */
    fromSource (data, {useDefaults = false, params = {}, datatype: casttype} = {}) {
      casttype = datatype || casttype
      if (!data || !casttype) {
        return null
      }
      const items = getPath(data, path)

      const mapOne = (data) => {
        if (!comparePath(data, qualifier)) {
          return null
        }

        let item
        if (attrMappers.length === 0 && relMappers.length === 0) {
          if (data.type !== casttype.id) {
            return null
          }
          item = data
        } else {
          const setValue = (obj, {key, fromSource}) => {
            obj[key] = fromSource(data, params)
            return obj
          }

          item = {
            attributes: attrMappers.reduce(setValue, {}),
            relationships: relMappers.reduce(setValue, {})
          }
        }

        item = casttype.cast(item, {useDefaults})

        const reverse = false
        item = mapWithMappers(item, transformPipeline, reverse, data)

        const passedFilter = filterWithFilters(item, filterFromPipeline)
        return (passedFilter) ? item : null
      }

      if (Array.isArray(items)) {
        return items.map(mapOne).filter((item) => item !== null)
      }
      if (items) {
        return mapOne(items)
      }
      return null
    },

    /**
     * Map data to a source with attributes and relationships.
     * For item mappers with the special catch-all type `*`, attributes and
     * relationships will not be mapped, instead the data is used as is.
     * @param {Object} data - The data to map
     * @param {Object} object - The object to map to data on
     * @returns {Object} Mapped data
     */
    toSource (data, {target = {}, useDefaults = false, datatype: casttype} = {}) {
      casttype = datatype || casttype
      if (!data || !casttype) {
        return null
      }

      let item = {}
      const typed = casttype.cast(data, {useDefaults})

      if (attrMappers.length === 0 && relMappers.length === 0) {
        item = typed
      } else {
        const {attributes, relationships} = typed

        attrMappers.forEach(({key, path, toSource}) => {
          const isPropKey = (/^(id|type|(cre|upd)atedAt)$/.test(key))
          const value = (isPropKey) ? typed[key] : attributes[key]
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
      item = mapWithMappers(item, transformPipeline, reverse, data)

      const passedFilter = filterWithFilters(item, filterToPipeline)
      return (passedFilter) ? setPath(target, path, item) : null
    }
  }
}

module.exports = itemMapper
