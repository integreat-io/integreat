const uuid = require('uuid/v4')

const expandField = (val) => (typeof val === 'string') ? {type: val} : val
const expandFields = (vals) => Object.keys(vals)
  .reduce((newVals, key) => ({...newVals, [key]: expandField(vals[key])}), {})

const formatValue = (value, {type}) => {
  switch (type) {
    case 'integer':
      const int = Number.parseInt(value, 10)
      return (isNaN(int)) ? undefined : int
    case 'float':
      const float = Number.parseFloat(value)
      return (isNaN(float)) ? undefined : float
    case 'date':
      const date = (value !== null) ? new Date(value) : null
      return (!date || isNaN(date.getTime())) ? undefined : date
    case 'boolean':
      return (value === 'false') ? false : !!value
  }
  // Default 'string'
  return (value) ? value.toString() : undefined
}

const setDates = (attrs) => {
  attrs.createdAt = new Date(attrs.createdAt || attrs.updatedAt || new Date())
  attrs.updatedAt = new Date(attrs.updatedAt || attrs.createdAt)
}

const castAttributes = (dataAttrs = {}, typeAttrs, defaults) => {
  return Object.keys(dataAttrs)
    .reduce((attrs, key) => {
      if (typeAttrs.hasOwnProperty(key)) {
        const value = formatValue(dataAttrs[key], typeAttrs[key])
        if (value !== undefined) {
          attrs[key] = value
        }
      }
      return attrs
    }, defaults)
}

const getRelId = (rel) => (rel.id) ? rel.id : rel.toString()
const castRel = (val, type) => (val === null) ? null : {id: getRelId(val), type}
const castRels = (val, type) => (Array.isArray(val))
  ? val.map(val => castRel(val, type))
  : castRel(val, type)

const castRelationships = (dataRels = {}, typeRels, defaults) => {
  return Object.keys(dataRels)
    .reduce((rels, key) => (typeRels[key] && dataRels[key] !== undefined)
      ? {...rels, [key]: castRels(dataRels[key], typeRels[key].type)}
      : rels
    , defaults)
}

const getRelValue = (rel) => (Array.isArray(rel)) ? rel.map(val => val.id) : rel.id

const getFieldValue = (data, key) => data[key] ||
  (data.attributes && data.attributes[key]) ||
  (data.relationships && data.relationships[key] && getRelValue(data.relationships[key]))

/**
 * Create a datatype with the given id and source.
 * @param {Object} def - Object with id, plural, source, attributes, and relationships
 * @returns {Object} The created datatype
 */
function datatype ({
  id,
  plural,
  source,
  attributes: attrDefs,
  relationships: relDefs,
  access
}) {
  const attributes = {
    ...expandFields(attrDefs || {}),
    id: {type: 'string'},
    type: {type: 'string'},
    createdAt: {type: 'date'},
    updatedAt: {type: 'date'}
  }
  const relationships = expandFields(relDefs || {})

  const defaultAttrs = Object.keys(attrDefs || {})
    .reduce((attrs, key) => ({
      ...attrs,
      [key]: (attributes[key].default === undefined) ? null : attributes[key].default
    }), {})
  const defaultRels = Object.keys(relationships)
    .reduce((rels, key) => {
      const def = relationships[key].default
      if (def !== undefined) {
        rels[key] = (def === null) ? null : {id: def, type: relationships[key].type}
      }
      return rels
    }, {})

  return {
    id,
    plural,
    source,
    attributes,
    relationships,
    access,

    /**
     * Will cast the given data according to the type. Attributes will be
     * coerced to the right format, relationships will be expanded to
     * relationship objects, and object properties will be moved from
     * `attributes` or be set with defaults.
     * @param {Object} data - The data to cast
     * @param {boolean} useDefaults - Will use defaults if true
     * @returns {Object} Returned data in the format expected from the datatype
     */
    cast (data, {useDefaults = true} = {}) {
      if (!data) {
        return null
      }

      const attrs = castAttributes(data.attributes, attributes, (useDefaults) ? {...defaultAttrs} : {})
      if (useDefaults) {
        setDates(attrs)
      }
      const rels = castRelationships(data.relationships, relationships, (useDefaults) ? {...defaultRels} : {})
      const castId = data.id || attrs.id || uuid()
      delete attrs.id

      return {
        id: castId,
        type: id,
        attributes: attrs,
        relationships: rels
      }
    },

    castQueryParams (relId, data) {
      const relationship = relationships[relId]

      return Object.keys(relationship.query)
        .reduce((params, key) => {
          const value = getFieldValue(data, relationship.query[key])
          if (value === undefined) {
            throw new TypeError('Missing value for query param')
          }
          return {...params, [key]: value}
        }, {})
    }
  }
}

module.exports = datatype
