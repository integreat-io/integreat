import cast from './cast'
import castQueryParams from './castQueryParams'
import mapAny = require('map-any')
import createDefMapping from './createDefMapping'
import { GenericData, SchemaDef } from '../types'

const expandField = val => (typeof val === 'string' ? { type: val } : val)
const expandFields = vals =>
  Object.keys(vals).reduce(
    (newVals, key) => ({ ...newVals, [key]: expandField(vals[key]) }),
    {}
  )

const prepareDefaultAttrs = (attributes, attrDefs) =>
  Object.keys(attrDefs || {}).reduce(
    (attrs, key) => ({
      ...attrs,
      [key]:
        attributes[key].default === undefined ? null : attributes[key].default
    }),
    {}
  )

const prepareDefaultRels = relationships =>
  Object.keys(relationships).reduce((rels, key) => {
    const def = relationships[key].default
    if (def !== undefined) {
      rels[key] =
        def === null ? null : { id: def, type: relationships[key].type }
    }
    return rels
  }, {})

/**
 * Create a schema with the given id and service.
 * @param def - Object with id, plural, service, attributes, and relationships
 * @returns The created schema
 */
function schema({
  id,
  plural,
  service,
  attributes: attrDefs,
  relationships: relDefs,
  access,
  internal = false
}: SchemaDef) {
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

  const mapping = createDefMapping(
    {
      id: 'string',
      type: { $cast: 'string', $const: id },
      attributes: {
        ...attrDefs,
        createdAt: 'date',
        updatedAt: 'date'
      },
      relationships: relDefs
    },
    id
  )

  const castFn = cast({
    id,
    attributes,
    relationships,
    defaultAttrs,
    defaultRels
  })

  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    attributes,
    relationships,
    access,
    mapping,

    /**
     * Will cast the given data according to the type. Attributes will be
     * coerced to the right format, relationships will be expanded to
     * relationship objects, and object properties will be moved from
     * `attributes` or be set with defaults.
     * @param data - The data to cast
     * @param options - onlyMappedValues: use defaults if true
     * @returns Returned data in the format expected from the schema
     */
    cast(data: GenericData, { onlyMappedValues = false } = {}) {
      return mapAny(data => castFn(data, { onlyMappedValues }), data)
    },

    /**
     * Will create a query object for a relationship, given the relationship id
     * and a data item to get field values from.
     *
     * If the relationship is set up with a query definition object, each prop
     * of this object references field ids in the given data item. The returned
     * query object will have these ids replaced with actual field values.
     *
     * @param relId - The id of a relationship
     * @param data - A data item to get field values from.
     * @returns Query object
     */
    castQueryParams(relId: string, data: GenericData) {
      return castQueryParams(relId, data, { relationships })
    }
  }
}

export default schema
