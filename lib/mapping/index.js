const fromService = require('./itemFromService')
const toService = require('./itemToService')
const fieldMapper = require('./fieldMapper')
const preparePipeline = require('../utils/preparePipeline')
const {compile: compilePath} = require('../utils/path')

const completeShortForm = (mapping) => (typeof mapping === 'string' || Array.isArray(mapping)) ? {path: mapping} : mapping

const prepareMappings = (attrMappings, relMappings, datatype, formatters) => {
  const setupMapping = (mappings, types, isRelationship) => Object.keys(mappings)
    .filter((key) => types.hasOwnProperty(key))
    .map((key) => fieldMapper(
      ({key, type: types[key].type, ...completeShortForm(mappings[key])}),
      {formatters, isRelationship}
    ))

  return [
    ...setupMapping(attrMappings, datatype.attributes, false),
    ...setupMapping(relMappings, datatype.relationships, true)
  ]
}
/**
 * Return item mapper object with fromService and toService.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, transform, and filters
 * @returns {Object} Item mapper object
 */
function mapping ({
  id = null,
  type,
  service = null,
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

  const mappings = prepareMappings(attrMappings, relMappings, datatype, formatters)

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  return {
    id,
    type,
    service,
    datatype,

    /**
     * Map data from a service with attributes and relationships.
     * @param {Object} data - The service item to map from
     * @param {Object} params - The service item to map from
     * @param {Object} options - useDefaults
     * @returns {Object} Target item
     */
    fromService (data, params = {}, {useDefaults = false} = {}) {
      return fromService(data, params, {
        useDefaults,
        type,
        path,
        qualifier,
        mappings,
        transformPipeline,
        filterFromPipeline,
        datatype
      })
    },

    /**
     * Map data to a service with attributes and relationships.
     * @param {Object} data - The data item to map
     * @param {Object} target - Optional object to map to data on
     * @returns {Object} Mapped data
     */
    toService (data, target = {}) {
      return toService(data, target, {
        path, mappings, transformPipeline, filterToPipeline
      })
    }
  }
}

module.exports = mapping
