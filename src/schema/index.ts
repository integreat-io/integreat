import createCastMapping from './createCastMapping'
import { SchemaDef } from '../types'

const expandField = val => (typeof val === 'string' ? { type: val } : val)
const expandFields = vals =>
  Object.keys(vals).reduce(
    (newVals, key) => ({ ...newVals, [key]: expandField(vals[key]) }),
    {}
  )

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

  const mapping = createCastMapping(
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

  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    attributes,
    relationships,
    access,
    mapping
  }
}

export default schema
