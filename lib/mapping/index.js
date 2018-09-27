const { compose, map, mergeDeepWith } = require('ramda')
const { mapTransform, transform, filter, compare, set, fwd, rev } = require('map-transform')
const is = require('@sindresorhus/is')
const { preparePipeline, prepareRevPipeline } = require('../utils/preparePipeline')
const { normalizeFieldMapping } = require('./normalize')

const prepareAttrMapping = (transformers) => map(normalizeFieldMapping(transformers))
const prepareRelMapping = (transformers) => map((def) => [...normalizeFieldMapping(transformers)(def), rev(set('id'))])

const prepareMapping = ({ id = null, type = null, ...attributes }, relationships, toService, transformers) =>
  (id || Object.keys(attributes).length > 0 || Object.keys(relationships).length > 0)
    ? {
      id,
      type: (type) ? rev(type) : null,
      attributes: prepareAttrMapping(transformers)(attributes),
      relationships: prepareRelMapping(transformers)(relationships),
      ...prepareAttrMapping(transformers)(toService)
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

const concatOrRight = (left, right) => (Array.isArray(left)) ? left.concat(right) : right

const ensureArray = (data) => (Array.isArray(data)) ? data : ((data) ? [data] : [])

/**
 * Return item mapper object with fromService and toService.
 * @param {Object} resources - mutators, filters, transformers, and schemas
 * @returns {Object} Item mapping def
 */
const mapping = ({ mutators, filters, transformers, schemas = {} } = {}) => ({
  id = null,
  type,
  path = null,
  attributes: attrDefs = {},
  relationships: relDefs = {},
  toService: toServiceDefs = {},
  mutate: mutateDef = null,
  mutateTo: mutateToDef = null,
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

  const mutatePipeline = preparePipeline(mutateDef, mutators)
  const mutateFwdPipeline = mutatePipeline.map(compose(fwd, transform))
  const mutateRevPipeline = prepareRevPipeline(mutateToDef, mutatePipeline, mutators)
  const filterFromPipeline = preparePipeline(filterFrom, filters).map(compose(fwd, filter))
  const filterToPipeline = preparePipeline(filterTo, filters).map(compose(rev, filter))

  const def = [
    fwd('data'),
    path,
    ...prepareQualifier(qualifier),
    ...prepareTypeQualifier(attrDefs, relDefs, type),
    prepareMapping(attrDefs, relDefs, toServiceDefs, transformers),
    transform(schema.cast),
    ...mutateFwdPipeline,
    ...mutateRevPipeline,
    ...filterFromPipeline,
    ...filterToPipeline,
    filter((item) => typeof item !== 'undefined'),
    rev(set('data'))
  ]
  const mapper = mapTransform(def)

  return {
    id,
    type,
    schema,

    /**
     * Map data from a service with attributes and relationships.
     * @param {Object} data - The service item to map from
     * @param {Object} options - onlyMappedValues
     * @returns {Object} Target item
     */
    fromService (data, { onlyMappedValues = true } = {}) {
      return (data)
        ? ensureArray((onlyMappedValues) ? mapper.onlyMappedValues(data) : mapper(data))
        : []
    },

    /**
     * Map data to a service with attributes and relationships.
     * @param {Object} data - The data item to map
     * @param {Object} target - Optional object to map to data on
     * @returns {Object} Mapped data
     */
    toService (data, target = null) {
      const mapped = mapper.rev.onlyMappedValues(data)
      return (
        (target)
          ? (Array.isArray(target))
            ? [...target].concat(mapped)
            : mergeDeepWith(concatOrRight, target, mapped)
          : mapped
      ) || null
    }
  }
}

module.exports = mapping
