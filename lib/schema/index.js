const cast = require('./cast')
const castQueryParams = require('./castQueryParams')
const mapAny = require('map-any')

const expandField = (val) => (typeof val === 'string') ? { type: val } : val
const expandFields = (vals) => Object.keys(vals)
  .reduce((newVals, key) => ({ ...newVals, [key]: expandField(vals[key]) }), {})

const prepareDefaultAttrs = (attributes, attrDefs) => Object.keys(attrDefs || {})
  .reduce((attrs, key) => ({
    ...attrs,
    [key]: (attributes[key].default === undefined) ? null : attributes[key].default
  }), {})

const prepareDefaultRels = (relationships) => Object.keys(relationships)
  .reduce((rels, key) => {
    const def = relationships[key].default
    if (def !== undefined) {
      rels[key] = (def === null) ? null : { id: def, type: relationships[key].type }
    }
    return rels
  }, {})

/**
 * Create a schema with the given id and service.
 * @param {Object} def - Object with id, plural, service, attributes, and relationships
 * @returns {Object} The created schema
 */
function schema ({
  id,
  plural,
  service,
  attributes: attrDefs,
  relationships: relDefs,
  access,
  internal = false
}) {
  const attributes = {
    ...expandFields(attrDefs || {}),
    id: { type: 'string' },
    type: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }
  const relationships = expandFields(relDefs || {})

  const defaultAttrs = prepareDefaultAttrs(attributes, attrDefs)
  const defaultRels = prepareDefaultRels(relationships, relDefs)

  const castFn = cast({ id, attributes, relationships, defaultAttrs, defaultRels })

  return {
    id,
    plural,
    service,
    internal,
    attributes,
    relationships,
    access,

    /**
     * Will cast the given data according to the type. Attributes will be
     * coerced to the right format, relationships will be expanded to
     * relationship objects, and object properties will be moved from
     * `attributes` or be set with defaults.
     * @param {Object} data - The data to cast
     * @param {boolean} onlyMappedValues - Will use defaults if true
     * @returns {Object} Returned data in the format expected from the schema
     */
    cast (data, { onlyMappedValues = false } = {}) {
      return mapAny((data) => castFn(data, { onlyMappedValues }), data)
    },

    /**
     * Will create a query object for a relationship, given the relationship id
     * and a data item to get field values from.
     *
     * If the relationship is set up with a query definition object, each prop
     * of this object references field ids in the given data item. The returned
     * query object will have these ids replaced with actual field values.
     *
     * @param {string} relId - The id of a relationship
     * @param {Object} data - A data item to get field values from.
     * @returns {Object} Query object
     */
    castQueryParams (relId, data) {
      return castQueryParams(relId, data, { relationships })
    }
  }
}

module.exports = schema
