import createCastMapping from './createCastMapping'
import { SchemaDef, PropertySchema, Schema } from '../types'
import { isSchema } from '../utils/is'
import nanoid = require('nanoid')

const expandField = (val: Schema | PropertySchema | string | undefined) =>
  typeof val === 'string'
    ? { $cast: val }
    : isSchema(val)
    ? expandFields(val) // eslint-disable-line @typescript-eslint/no-use-before-define
    : val

const expandFields = (vals: Schema) =>
  Object.entries(vals).reduce(
    (newVals, [key, def]) => ({ ...newVals, [key]: expandField(def) }),
    {}
  )

const defaultId = () => nanoid()
const defaultDate = () => new Date()

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
        id: { $cast: 'string', $default: defaultId },
        createdAt: { $cast: 'date', $default: defaultDate },
        updatedAt: { $cast: 'date', $default: defaultDate }
      },
      id
    )
  }
}
