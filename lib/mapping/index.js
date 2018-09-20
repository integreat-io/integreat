const { compose, map, mergeDeepWith } = require('ramda')
const { mapTransform, transform, filter, compare, set, fwd, rev } = require('map-transform')
const is = require('@sindresorhus/is')
const mapAny = require('map-any')
const preparePipeline = require('../utils/preparePipeline')
const { normalizeFieldMapping } = require('./normalize')

const transformRelationship = (id) => id
transformRelationship.rev = mapAny((rel) => rel.id)

const prepareAttrMapping = (formatters) => map(normalizeFieldMapping(formatters))
const prepareRelMapping = (formatters) => map((def) => [...normalizeFieldMapping(formatters)(def), rev(set('id'))])

const prepareMapping = ({ id = null, type = null, ...attributes }, relationships, formatters) =>
  (id || Object.keys(attributes).length > 0 || Object.keys(relationships).length > 0)
    ? {
      id,
      type: (type) ? rev(type) : null,
      attributes: prepareAttrMapping(formatters)(attributes),
      relationships: prepareRelMapping(formatters)(relationships)
    }
    : {
      id: 'id',
      type: rev('type'),
      attributes: 'attributes',
      relationships: 'relationships'
    }

const createCompareFilter = ([path, value]) => {
  try {
    return [filter(compare(path, JSON.parse(value)))]
  } catch (error) {
    return []
  }
}
const prepareQualifier = (qualifier) => (qualifier) ? createCompareFilter(qualifier.split('=')) : []

const prepareTypeQualifier = (attrs, rels, type) => (is.empty(attrs) && is.empty(rels))
  ? [filter(compare('type', type))]
  : []

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
    fwd('data'),
    path,
    ...prepareQualifier(qualifier),
    ...prepareTypeQualifier(attrDefs, relDefs, type),
    prepareMapping(attrDefs, relDefs, formatters),
    ...transformFwdPipeline,
    ...transformRevPipeline,
    ...filterFromPipeline,
    ...filterToPipeline
  ]
  const mapper = mapTransform(def)

  return {
    id,
    type,
    schema,

    /**
     * Map data from a service with attributes and relationships.
     * @param {Object} data - The service item to map from
     * @param {Object} options - useDefaults
     * @returns {Object} Target item
     */
    fromService (data, { useDefaults = false } = {}) {
      if (!data) {
        return []
      }

      return [].concat((useDefaults) ? mapper(data) : mapper.onlyMappedValues(data))
        .map((data) => schema.cast(data, { useDefaults }))
        .filter((item) => !!item)
    },

    /**
     * Map data to a service with attributes and relationships.
     * @param {Object} data - The data item to map
     * @param {Object} target - Optional object to map to data on
     * @returns {Object} Mapped data
     */
    toService (data, target = null) {
      const mapped = mapper.rev.onlyMappedValues(data)
      return ((target) ? mergeDeepWith(mergeFn, target, mapped) : mapped) || null
    }
  }
}

module.exports = mapping
