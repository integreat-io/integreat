const R = require('ramda')
const mapTransform = require('map-transform')
const mapAny = require('map-any')
const preparePipeline = require('../utils/preparePipeline')
const { compile: compilePath } = require('../utils/path')

const normalizePath = (path) => path // (path) ? `data.${path}` : 'data'

// const completeShortForm = (mapping) => (typeof mapping === 'string' || Array.isArray(mapping))
//   ? { path: mapping } : mapping

const renameFieldMapping = ({ format, ...rest }) => ({ transform: format, ...rest })
const normalizeFieldMapping = (def) => (typeof def === 'string') ? { path: def } : renameFieldMapping(def)

const transformRelationship = (id) => id
transformRelationship.rev = mapAny((rel) => rel.id)
const addRelTransform = (def) => (def.transform)
  ? { ...def, transform: [].concat(def.transform, transformRelationship) }
  : { ...def, transform: transformRelationship }

const prepareAttrMapping = R.map(normalizeFieldMapping)
const prepareRelMapping = R.map(R.compose(addRelTransform, normalizeFieldMapping))

const prepareMapping = ({ id, type, ...attributes }, relationships) => ({
  id,
  type,
  attributes: prepareAttrMapping(attributes),
  relationships: prepareRelMapping(relationships)
})

// const prepareMappings = (attrMappings, relMappings, schema, formatters) => {
//   const setupMapping = (mappings, types, isRelationship) => Object.keys(mappings)
//     .filter((key) => types.hasOwnProperty(key))
//     .map((key) => fieldMapper(
//       ({ key, type: types[key].type, ...completeShortForm(mappings[key]) }),
//       { formatters, isRelationship }
//     ))
//
//   return [
//     ...setupMapping(attrMappings, schema.attributes, false),
//     ...setupMapping(relMappings, schema.relationships, true)
//   ]
// }

const mergeFn = (left, right) => (Array.isArray(left)) ? left.concat(right) : right

/**
 * Return item mapper object with fromService and toService.
 * @param {Object} params - Named parameters: type, path, attributes, relationships, transform, and filters
 * @returns {Object} Item mapper object
 */
const mapping = ({ transformers, filters, formatters, schemas = {} } = {}) => ({
  id = null,
  type,
  path = null,
  attributes: attrMappings = {},
  relationships: relMappings = {},
  transform = null,
  filterFrom = null,
  filterTo = null,
  qualifier = null
}) => {
  if (!type) {
    throw new TypeError('Can\'t create mapping without type')
  }
  const schema = schemas[type]
  if (!schema) {
    throw new TypeError(`Can't create mapping with unknown type '${type}'`)
  }

  const transformPipeline = preparePipeline(transform, transformers)
  const filterFromPipeline = preparePipeline(filterFrom, filters)
  const filterToPipeline = preparePipeline(filterTo, filters)

  const def = {
    mapping: prepareMapping(attrMappings, relMappings),
    pathFrom: normalizePath(path),
    pathFromRev: path,
    transform: transformPipeline,
    filterTo: filterFromPipeline,
    filterToRev: filterToPipeline
  }
  const mapper = mapTransform(def)

  path = compilePath(path)
  qualifier = compilePath(qualifier)

  // const mappings = prepareMappings(attrMappings, relMappings, schema, formatters)

  return {
    id,
    type,
    schema,

    /**
     * Map data from a service with attributes and relationships.
     * @param {Object} data - The service item to map from
     * @param {Object} params - The service item to map from
     * @param {Object} options - useDefaults
     * @returns {Object} Target item
     */
    fromService (data, params = {}, { useDefaults = false } = {}) {
      return [].concat((useDefaults) ? mapper(data) : mapper.noDefaults(data))
        .map((data) => schema.cast(data, { useDefaults }))
        .filter((item) => !!item)
      // return fromService(data, params, {
      //   useDefaults,
      //   type,
      //   path,
      //   qualifier,
      //   mappings,
      //   transformPipeline,
      //   filterFromPipeline,
      //   schema
      // })
    },

    /**
     * Map data to a service with attributes and relationships.
     * @param {Object} data - The data item to map
     * @param {Object} target - Optional object to map to data on
     * @returns {Object} Mapped data
     */
    toService (data, target = null) {
      const mapped = mapper.rev.noDefaults(data)
      return (target) ? R.mergeDeepWith(mergeFn, target, mapped) : mapped
      // return toService(data, target, {
      //   path, mappings, transformPipeline, filterToPipeline
      // })
    }
  }
}

module.exports = mapping
