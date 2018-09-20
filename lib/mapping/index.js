const R = require('ramda')
const { mapTransform, transform, filter, set, fwd, rev } = require('map-transform')
const mapAny = require('map-any')
const preparePipeline = require('../utils/preparePipeline')
const { compile: compilePath } = require('../utils/path')
const { normalizeFieldMapping } = require('./normalize')

const { compose } = R

const transformRelationship = (id) => id
transformRelationship.rev = mapAny((rel) => rel.id)

const prepareAttrMapping = R.map(normalizeFieldMapping)
const prepareRelMapping = R.map((def) => [...normalizeFieldMapping(def), rev(set('id'))])

const prepareMapping = ({ id = null, type = null, ...attributes }, relationships) =>
  (id || Object.keys(attributes).length > 0 || Object.keys(relationships).length > 0)
    ? {
      id,
      type,
      attributes: prepareAttrMapping(attributes),
      relationships: prepareRelMapping(relationships)
    }
    : {
      id: 'id',
      type: rev('type'),
      attributes: 'attributes',
      relationships: 'relationships'
    }

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
  attributes: attrDefs = {},
  relationships: relDefs = {},
  transform: transformDef = null,
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

  const transformPipeline = preparePipeline(transformDef, transformers)
  const transformFwdPipeline = transformPipeline.map(compose(fwd, transform))
  const transformRevPipeline = transformPipeline.map((fn) => (fn.rev) ? rev(transform(fn.rev)) : null).filter(Boolean)
  const filterFromPipeline = preparePipeline(filterFrom, filters).map(compose(fwd, filter))
  const filterToPipeline = preparePipeline(filterTo, filters).map(compose(rev, filter))

  const def = [
    // fwd('data'),
    path,
    // pathFromRev: path,
    prepareMapping(attrDefs, relDefs),
    ...transformFwdPipeline,
    ...transformRevPipeline,
    ...filterFromPipeline,
    ...filterToPipeline
  ]
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
      if (!data) {
        return []
      }

      return [].concat((useDefaults) ? mapper(data) : mapper.onlyMappedValues(data))
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
      const mapped = mapper.rev.onlyMappedValues(data)
      return ((target) ? R.mergeDeepWith(mergeFn, target, mapped) : mapped) || null
      // return toService(data, target, {
      //   path, mappings, transformPipeline, filterToPipeline
      // })
    }
  }
}

module.exports = mapping
