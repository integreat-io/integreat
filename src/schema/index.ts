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

const expandFields = (vals: Shape): Shape =>
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
  shape: rawShape,
  access,
  internal = false,
}: SchemaDef): Schema {
  const shape = {
    ...expandFields(rawShape || {}),
    id: { $type: 'string', $default: generateId ? defaultId : null },
    ...(rawShape?.createdAt ? { createdAt: { $type: 'date' } } : {}),
    ...(rawShape?.updatedAt ? { updatedAt: { $type: 'date' } } : {}),
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
