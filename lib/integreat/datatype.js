const uuid = require('uuid/v4')

const expandVal = (val) => (typeof val === 'string') ? {type: val} : val
const expandVals = (vals) => Object.keys(vals)
  .filter((key) => !(/^(id|type|(cre|upd)atedAt)$/.test(key)))
  .reduce((newVals, key) => ({...newVals, [key]: expandVal(vals[key])}), {})

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

const castAttributes = (dataAttrs, typeAttrs, defaults) => {
  const createdAt = new Date(dataAttrs.createdAt ||
    dataAttrs.updatedAt || new Date())
  const updatedAt = new Date(dataAttrs.updatedAt || createdAt)

  const attrs = {createdAt, updatedAt, ...defaults}

  return Object.keys(dataAttrs)
    .reduce((attrs, key) => {
      if (typeAttrs.hasOwnProperty(key)) {
        const value = formatValue(dataAttrs[key], typeAttrs[key])
        if (value !== undefined) {
          attrs[key] = value
        }
      }
      return attrs
    }, attrs)
}

const getRelId = (rel) => (rel.id) ? rel.id : rel.toString()
const castRel = (val, type) => (val === null) ? null : {id: getRelId(val), type}
const castRels = (val, type) => (Array.isArray(val))
  ? val.map(val => castRel(val, type))
  : castRel(val, type)

const castRelationships = (dataRels, typeRels, defaults) => {
  return Object.keys(dataRels)
    .reduce((rels, key) => (typeRels[key] && dataRels[key] !== undefined)
      ? {...rels, [key]: castRels(dataRels[key], typeRels[key].type)}
      : rels
    , defaults)
}

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
  relationships: relDefs
}) {
  const attributes = expandVals(attrDefs || {})
  const relationships = expandVals(relDefs || {})

  const defaultAttrs = Object.keys(attributes)
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

    /**
     * Will cast the given data according to the type. Attributes will be
     * coerced to the right format, relationships will be expanded to
     * relationship objects, and object properties will be moved from
     * `attributes` or be set with defaults.
     * @param {Object} data - The data to cast
     * @param {boolean} useDefaults - Will use defaults if true
     * @returns {Object} Returned data in the format expected from the datatype
     */
    cast (data, {useDefaults = false} = {}) {
      if (!data) {
        return null
      }

      const {attributes: dataAttrs = {}, relationships: dataRels = {}} = data

      const attrs = (useDefaults) ? {...defaultAttrs} : {}
      const rels = (useDefaults) ? {...defaultRels} : {}

      return {
        id: data.id || dataAttrs.id || uuid(),
        type: id,
        attributes: castAttributes(dataAttrs, attributes, attrs),
        relationships: castRelationships(dataRels, relationships, rels)
      }
    }
  }
}

module.exports = datatype
