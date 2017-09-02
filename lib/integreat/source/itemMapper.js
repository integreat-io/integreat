const valueMapper = require('./valueMapper')
const preparePipeline = require('../../utils/preparePipeline')
const mapWithMappers = require('../../utils/mapWithMappers')
const filterWithFilters = require('../../utils/filterWithFilters')
const {compile: compilePath, get: getPath, set: setPath} = require('../../utils/path')

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
  path = compilePath(path)

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

      const mapOne = (item) => {
        if (attrMappers.length > 0 || relMappers.length > 0) {
          const setValue = (obj, {key, fromSource}) => {
            obj[key] = fromSource(item, params)
            return obj
          }

          item = {
            attributes: attrMappers.reduce(setValue, {}),
            relationships: relMappers.reduce(setValue, {})
          }
        } else if (item.type !== casttype.id) {
          return null
        }

        item = casttype.cast(item, {useDefaults})

        const reverse = false
        item = mapWithMappers(item, transformPipeline, reverse)

        const passedFilter = filterWithFilters(item, filterFromPipeline)
        return (passedFilter) ? item : null
      }

      return (Array.isArray(items))
        ? items.map(mapOne).filter((item) => item !== null)
        : mapOne(items)
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
      data = casttype.cast(data, {useDefaults})

      if (attrMappers.length === 0 && relMappers.length === 0) {
        item = data
      } else {
        const {attributes, relationships} = data

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
      item = mapWithMappers(item, transformPipeline, reverse)

      const passedFilter = filterWithFilters(item, filterToPipeline)
      return (passedFilter) ? setPath(target, path, item) : null
    }
  }
}

module.exports = itemMapper
