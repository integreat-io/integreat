const expandVal = (val) => (typeof val === 'string') ? {type: val} : val
const expandVals = (vals) => Object.keys(vals).reduce((newVals, key) =>
  Object.assign(newVals, {[key]: expandVal(vals[key])}
), {})

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

  return {
    id,
    source,
    attributes,
    relationships,

    /**
     * Return default values of the attributes not present in the given object.
     * Will return attributes without a default value, with value set to null.
     * @param {Object} presentAttrs - Object with properties _not_ to return
     * @returns {Object} Object missing attributes
     */
    missingAttributes (presentAttrs) {
      const isMissing = (key) => key !== 'type' && !presentAttrs.hasOwnProperty(key)
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
