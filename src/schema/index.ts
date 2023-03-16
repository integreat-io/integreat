import createCastMapping from './createCastMapping.js'
import accessForAction from './accessForAction.js'
import type { TransformDefinition } from 'map-transform/types.js'
import { SchemaDef, PropertyShape, Shape, Access, AccessDef } from './types.js'
import { isSchema } from '../utils/is.js'
import { nanoid } from 'nanoid'

const expandField = (val: Shape | PropertyShape | string | undefined) =>
  typeof val === 'string'
    ? { $cast: val }
    : isSchema(val)
    ? expandFields(val)
    : val

const expandFields = (vals: Shape): Shape =>
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
  access?: string | AccessDef
  mapping: TransformDefinition
  accessForAction: (actionType?: string) => Access
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
  generateId = false,
  shape,
  access,
  internal = false,
}: SchemaDef): Schema {
  const mapping = createCastMapping(
    {
      ...shape,
      id: { $cast: 'string', $default: generateId ? defaultId : null },
      createdAt: { $cast: 'date', $default: defaultDate },
      updatedAt: { $cast: 'date', $default: defaultDate },
    },
    id
  )

  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    shape: {
      ...expandFields(shape || {}),
      id: { $cast: 'string' },
      createdAt: { $cast: 'date' },
      updatedAt: { $cast: 'date' },
    },
    access,
    accessForAction: accessForAction(access),
    mapping,
  }
}
