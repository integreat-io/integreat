import expandShape from './expandShape.js'
import createCast from './createCast.js'
import accessForAction from './accessForAction.js'
import {
  SchemaDef,
  FieldDefinition,
  ShapeDef,
  Shape,
  CastFn,
  Access,
  AccessDef,
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
    {},
  )

const expandAccess = (access?: string | AccessDef): AccessDef | undefined =>
  typeof access === 'string' ? { allow: access } : access

/**
 * A schema with shape, cast function, and info on access control.
 */
export default class Schema {
  id: string
  plural?: string
  service?: string
  internal: boolean
  shape: Shape
  access?: AccessDef
  castFn: CastFn

  constructor(
    def: SchemaDef,
    schemas: Map<string, Schema> = new Map<string, Schema>(),
  ) {
    this.id = def.id
    this.plural = def.plural || `${def.id}s`
    this.service = def.service
    this.internal = def.internal ?? false
    this.shape = expandShape(def.shape || {})
    this.access = expandAccess(def.access)
    const castFn = createCast(this.shape, def.id, schemas, def.generateId)
    this.castFn = castFn
  }

  accessForAction(actionType?: string): Access {
    return accessForAction(this.access, actionType)
  }
}
