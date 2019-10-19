import createCastMapping from './createCastMapping'
import { MapDefinition } from 'map-transform'
import { SchemaDef, PropertyShape, Shape } from '../types'
import { isSchema } from '../utils/is'
import nanoid = require('nanoid')

const expandField = (val: Shape | PropertyShape | string | undefined) =>
  typeof val === 'string'
    ? { $cast: val }
    : isSchema(val)
    ? expandFields(val) // eslint-disable-line @typescript-eslint/no-use-before-define
    : val

const expandFields = (vals: Shape) =>
  Object.entries(vals).reduce(
    (newVals, [key, def]) => ({ ...newVals, [key]: expandField(def) }),
    {}
  )

const defaultId = () => nanoid()
const defaultDate = () => new Date()

export interface Schema {
  id: string
  plural?: string
  service?: string
  internal: boolean
  shape: Shape
  access?: string | object
  mapping: MapDefinition
}

/**
 * Create a schema with the given id and service.
 * @param def - Object with id, plural, service, and shape
 * @returns The created schema
 */
export default function createSchema({
  id,
  plural,
  service,
  shape,
  access,
  internal = false
}: SchemaDef): Schema {
  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    shape: {
      ...expandFields(shape || {}),
      id: { $cast: 'string' },
      createdAt: { $cast: 'date' },
      updatedAt: { $cast: 'date' }
    },
    access,
    mapping: createCastMapping(
      {
        ...shape,
        id: { $cast: 'string', $default: defaultId },
        createdAt: { $cast: 'date', $default: defaultDate },
        updatedAt: { $cast: 'date', $default: defaultDate }
      },
      id
    )
  }
}
