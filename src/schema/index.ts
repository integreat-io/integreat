import { transform } from 'map-transform'
import expandShape from './expandShape.js'
import createCast from './createCast.js'
import accessForAction from './accessForAction.js'
import type { TransformDefinition } from 'map-transform/types.js'
import {
  SchemaDef,
  FieldDefinition,
  ShapeDef,
  Shape,
  CastFn,
  Access,
  AccessDef,
  CastFns,
} from './types.js'
import { isShape } from '../utils/is.js'

const expandField = (val: ShapeDef | FieldDefinition | string | undefined) =>
  typeof val === 'string'
    ? { $type: val }
    : isShape(val)
    ? expandFields(val)
    : val

const expandFields = (vals: ShapeDef): Shape =>
  Object.entries(vals).reduce(
    (newVals, [key, def]) =>
      def ? { ...newVals, [key]: expandField(def) } : newVals,
    {}
  )

export interface Schema {
  id: string
  plural?: string
  service?: string
  internal: boolean
  shape: ShapeDef
  access?: string | AccessDef
  mapping: TransformDefinition
  castFn: CastFn
  accessForAction: (actionType?: string) => Access
}

/**
 * Create a schema with the given id and service.
 * @param def - Object with id, plural, service, and shape
 * @returns The created schema
 */
// TODO: Refactor as class
export default function createSchema(
  {
    id,
    plural,
    service,
    generateId = false,
    shape: rawShape = {},
    access,
    internal = false,
  }: SchemaDef,
  castFns: CastFns = new Map()
): Schema {
  const shape = expandShape(rawShape)
  const castFn = createCast(shape, id, castFns, generateId)
  const mapping: TransformDefinition = [
    transform(
      () =>
        (data, { rev = false }) =>
          castFn(data, rev)
    ),
  ]

  return {
    id,
    plural: plural || `${id}s`,
    service,
    internal,
    shape,
    access,
    accessForAction: accessForAction(access),
    mapping,
    castFn,
  }
}
