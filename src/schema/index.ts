import createCastMapping from './createCastMapping.js'
import accessForAction from './accessForAction.js'
import type { TransformDefinition } from 'map-transform/types.js'
import {
  SchemaDef,
  FieldDefinition,
  Shape,
  Access,
  AccessDef,
} from './types.js'
import { isShape } from '../utils/is.js'
import { nanoid } from 'nanoid'

const expandField = (val: Shape | FieldDefinition | string | undefined) =>
  typeof val === 'string'
    ? { $type: val }
    : isShape(val)
    ? expandFields(val)
    : val

const expandFields = (
  vals: Shape
): Record<string, FieldDefinition | Shape | undefined> =>
  Object.entries(vals).reduce(
    (newVals, [key, def]) => ({ ...newVals, [key]: expandField(def) }),
    {}
  )

const defaultId = () => nanoid()

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

const verifyFieldType = (
  field: FieldDefinition | Shape | undefined,
  type: string
) => !field || field.$type === type

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
  shape: rawShape = {},
  access,
  internal = false,
}: SchemaDef): Schema {
  const { id: idField, ...fields } = expandFields(rawShape)

  const fieldErrors = [
    verifyFieldType(idField, 'string') ? undefined : "'id' must be a string.",
    verifyFieldType(fields.createdAt, 'date')
      ? undefined
      : "'createdAt' must be a date.",
    verifyFieldType(fields.updatedAt, 'date')
      ? undefined
      : "'updatedAt' must be a date.",
  ].filter(Boolean)

  if (fieldErrors.length > 0) {
    throw new Error(fieldErrors.join(' '))
  }

  const shape = {
    id: { $type: 'string', default: generateId ? defaultId : null },
    ...fields,
  }
  const mapping = createCastMapping(shape, id)

  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    shape,
    access,
    accessForAction: accessForAction(access),
    mapping,
  }
}
