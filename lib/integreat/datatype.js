const uuid = require('uuid/v4')

const expandVal = (val) => (typeof val === 'string') ? {type: val} : val
const expandVals = (vals) => Object.keys(vals)
  .filter((key) => !(/^(id|type|(cre|upd)atedAt)$/.test(key)))
  .reduce((newVals, key) => Object.assign(newVals, {[key]: expandVal(vals[key])}), {})

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
  }
  // Default 'string'
  return (value) ? value.toString() : undefined
}

const castAttributes = (dataAttrs, typeAttrs, defaults) => {
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

const castRelationships = (dataRels, typeRels, defaults) => {
  return Object.keys(dataRels)
    .reduce((rels, key) => {
      if (typeRels[key]) {
        const value = dataRels[key]
        if (value !== undefined) {
          const {type} = typeRels[key]
          const getRelId = (rel) => (rel.id) ? rel.id : rel.toString()
          const castRel = (val) => (val === null) ? null : {id: getRelId(val), type}
          rels[key] = (Array.isArray(value)) ? value.map(castRel) : castRel(value)
        }
      }
      return rels
    }, defaults)
}
/**
 * Create a datatype with the given id and source.
 * @param {Object} def - Object with id, source, attributes, and relationships
 * @returns {Object} The created datatype
 */
function datatype ({
  id,
  source,
  attributes: attrDefs,
  relationships: relDefs
}) {
  const attributes = expandVals(attrDefs || {})
  const relationships = expandVals(relDefs || {})

  const defaultAttrs = Object.keys(attributes)
    .reduce((attrs, key) => Object.assign(attrs, {
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
      const {attributes: dataAttrs = {}, relationships: dataRels = {}} = data
      const createdAt = new Date(data.createdAt || dataAttrs.createdAt ||
        data.updatedAt || dataAttrs.updatedAt || new Date())
      const updatedAt = new Date(data.updatedAt || dataAttrs.updatedAt || createdAt)

      return {
        id: data.id || dataAttrs.id || uuid(),
        type: id,
        createdAt,
        updatedAt,
        attributes: castAttributes(dataAttrs, attributes, (useDefaults) ? Object.assign({}, defaultAttrs) : {}),
        relationships: castRelationships(dataRels, relationships, (useDefaults) ? Object.assign({}, defaultRels) : {})
      }
    },

    /**
     * Return default values of the attributes not present in the given object.
     * Will return attributes without a default value, with value set to null.
     * @param {Object} presentAttrs - Object with properties _not_ to return
     * @returns {Object} Object missing attributes
     */
    missingAttributes (presentAttrs) {
      const isMissing = (key) => !/^(id|type|(cre|upd)atedAt)$/.test(key) &&
        !presentAttrs.hasOwnProperty(key)
      const attrValue = (key) => attributes[key].default

      return Object.keys(attributes)
        .filter(isMissing)
        .reduce((attrs, key) => Object.assign(attrs, {
          [key]: (attributes[key].default === undefined) ? null : attrValue(key)
        }), {})
    },

    /**
     * Return default values of the relationships not present in the given
     * object. Will not return relationships without a default value.
     * @param {Object} presentAttrs - Object with properties _not_ to return
     * @returns {Object} Object missing attributes
     */
    missingRelationships (presentRels) {
      const isMissing = (key) =>
        !presentRels.hasOwnProperty(key) &&
        relationships[key].default !== undefined

      const relValue = (key) => ({
        id: relationships[key].default,
        type: relationships[key].type
      })

      return Object.keys(relationships)
        .filter(isMissing)
        .reduce((rels, key) => Object.assign(rels, {
          [key]: (relationships[key].default === null) ? null : relValue(key)
        }), {})
    }
  }
}

module.exports = datatype
