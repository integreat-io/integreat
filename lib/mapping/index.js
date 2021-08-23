const { compose, map, mergeDeepWith } = require('ramda')
const {
  mapTransform,
  transform,
  filter,
  set,
  fwd,
  rev,
  functions,
} = require('map-transform')
const is = require('@sindresorhus/is')
const {
  preparePipeline,
  prepareRevPipeline,
} = require('../utils/preparePipeline')
const { normalizeFieldMapping, pathToPipeline } = require('./normalize')

const { compare } = functions

const hasFieldMappings = (id, attributes, relationships) =>
  id ||
  Object.keys(attributes).length > 0 ||
  Object.keys(relationships).length > 0

const prepareRelationship = (normalize, createPipeline) => (relationship) =>
  relationship.mapping
    ? createPipeline(relationship.mapping, undefined, relationship.path)
        .pipeline
    : normalize(relationship)

function prepareMapping(
  {
    attributes: { id = null, type = null, ...attributes } = {},
    relationships = {},
    toService = {},
  },
  transformers,
  createPipeline
) {
  if (hasFieldMappings(id, attributes, relationships)) {
    const normalize = normalizeFieldMapping(transformers)
    return {
      id: id ? normalize(id) : null,
      type: type ? rev(type) : null,
      attributes: map(normalize, attributes),
      relationships: map(
        prepareRelationship(normalize, createPipeline),
        relationships
      ),
      ...map(normalize, toService),
    }
  } else {
    return {
      id: 'id',
      type: rev('type'),
      attributes: 'attributes',
      relationships: 'relationships',
    }
  }
}

const createCompareFilter = ([path, value]) => {
  try {
    return [filter(compare({ path, match: JSON.parse(value) }))]
  } catch (error) {
    return []
  }
}
const prepareQualifier = (qualifier) =>
  qualifier ? createCompareFilter(qualifier.split('=')) : []

const prepareTypeQualifier = ({ attributes = {}, relationships = {}, type }) =>
  is.emptyObject(attributes) && is.emptyObject(relationships)
    ? [filter(compare({ path: 'type', match: type }))]
    : []

const concatOrRight = (left, right) =>
  Array.isArray(left) ? left.concat(right) : right

const ensureArray = (data) => (Array.isArray(data) ? data : data ? [data] : [])

const joinPaths = (...paths) => paths.filter(Boolean).join('.')

const overrideMappingProps = (mapping, overrideType, prependPath) =>
  mapping
    ? {
        ...mapping,
        type: overrideType || mapping.type,
        path: Array.isArray(prependPath)
          ? prependPath.map((path) => joinPaths(path, mapping.path))
          : joinPaths(prependPath, mapping.path),
      }
    : undefined

const lookupMapping = (mapping, mappings) =>
  mappings[mapping] ? { ...mappings[mapping], id: mapping } : null

const expandMapping = (mapping, mappings, overrideType, prependPath) =>
  overrideMappingProps(
    typeof mapping === 'string' ? lookupMapping(mapping, mappings) : mapping,
    overrideType,
    prependPath
  )

const validateAndLookupSchema = (type, schemas) => {
  if (!type) {
    throw new TypeError("Can't create mapping without type")
  }
  const schema = schemas[type]
  if (!schema) {
    throw new TypeError(`Can't create mapping with unknown type '${type}'`)
  }
  return schema
}

const transformFwd = compose(fwd, transform)
const transformRev = compose(rev, transform)
const filterFwd = compose(fwd, filter)
const filterRev = compose(rev, filter)

const createPipelines = (mapping, transformers, filters) => {
  const {
    transform: transformDef = null,
    transformTo: transformToDef = null,
    filterFrom = null,
    filterTo = null,
  } = mapping

  const transformPipeline = preparePipeline(transformDef, transformers)

  return {
    transformFwd: transformPipeline.map(transformFwd),
    transformRev: prepareRevPipeline(
      transformToDef,
      transformPipeline,
      transformers
    ).map(transformRev),
    filterFrom: preparePipeline(filterFrom, filters).map(filterFwd),
    filterTo: preparePipeline(filterTo, filters).map(filterRev),
  }
}

const concatPipeline = (
  mapping,
  schema,
  { createPipelineFn, transformers, filters }
) => {
  const pipelines = createPipelines(mapping, transformers, filters)

  return [
    ...pathToPipeline(mapping.path),
    ...prepareQualifier(mapping.qualifier),
    ...prepareTypeQualifier(mapping),
    prepareMapping(mapping, transformers, createPipelineFn),
    transform(schema.cast),
    ...pipelines.transformFwd,
    ...pipelines.transformRev,
    ...pipelines.filterFrom,
    ...pipelines.filterTo,
    filter((item) => typeof item !== 'undefined'),
  ]
}

const createPipeline = (filters, transformers, schemas, mappings) => {
  const createPipelineFn = (mapping, overrideType, path) => {
    mapping = expandMapping(mapping, mappings, overrideType, path)
    if (!mapping) {
      return {}
    }
    const { id = null, type } = mapping

    const schema = validateAndLookupSchema(type, schemas)
    const pipeline = concatPipeline(mapping, schema, {
      createPipelineFn,
      transformers,
      filters,
    })

    return { id, type, schema, pipeline }
  }

  return createPipelineFn
}

/**
 * Return item mapper object with fromService and toService.
 * @param {Object} resources - filters, transformers, and schemas
 * @returns {Object} Item mapping def
 */
function mapping({
  filters,
  transformers,
  schemas = {},
  mappings: mappingsArr = [],
} = {}) {
  const mappings = mappingsArr.reduce(
    (mappings, def) => ({ ...mappings, [def.id]: def }),
    {}
  )
  const createPipelineFn = createPipeline(
    filters,
    transformers,
    schemas,
    mappings
  )

  return (mapping, overrideType) => {
    const { id, type, schema, pipeline } = createPipelineFn(
      mapping,
      overrideType
    )
    if (!pipeline) {
      return null
    }

    const mapper = mapTransform([fwd('data'), ...pipeline, rev(set('data'))])

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
      fromService(data, { onlyMappedValues = true } = {}) {
        return data
          ? ensureArray(
              onlyMappedValues ? mapper.onlyMappedValues(data) : mapper(data)
            )
          : []
      },

      /**
       * Map data to a service with attributes and relationships.
       * @param {Object} data - The data item to map
       * @param {Object} target - Optional object to map to data on
       * @returns {Object} Mapped data
       */
      toService(data, target = null) {
        const mapped = mapper.rev.onlyMappedValues(data)
        return (
          (target
            ? Array.isArray(target)
              ? [...target].concat(mapped)
              : mergeDeepWith(concatOrRight, target, mapped)
            : mapped) || null
        )
      },
    }
  }
}

module.exports = mapping
