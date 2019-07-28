import createCastMapping from './createCastMapping'
import { SchemaDef, PropertySchema, Schema } from '../types'
import { isSchema } from '../utils/is'

const expandField = (val: Schema | PropertySchema | string | undefined) =>
  typeof val === 'string'
    ? { $cast: val }
    : isSchema(val)
    ? expandFields(val)
    : val

const expandFields = (vals: Schema) =>
  Object.entries(vals).reduce(
    (newVals, [key, def]) => ({ ...newVals, [key]: expandField(def) }),
    {}
  )

/**
 * Create a schema with the given id and service.
 * @param def - Object with id, plural, service, and fields
 * @returns The created schema
 */
export default function createSchema({
  id,
  plural,
  service,
  fields,
  access,
  internal = false
}: SchemaDef) {
  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    fields: {
      ...expandFields(fields || {}),
      id: { $cast: 'string' },
      createdAt: { $cast: 'date' },
      updatedAt: { $cast: 'date' }
    },
    access,
    mapping: createCastMapping(
      {
        ...fields,
        id: 'string',
        createdAt: 'date',
        updatedAt: 'date'
      },
      id
    )
  }
}
