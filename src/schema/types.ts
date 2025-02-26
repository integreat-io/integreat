import type { DataFunction } from '../types.js'

export interface FieldDefinition {
  $type: string
  default?: unknown | DataFunction
  const?: unknown | DataFunction
}

export interface ShapeDef {
  [key: string]: ShapeDef | FieldDefinition | string | undefined
}

export interface Shape {
  [key: string]: FieldDefinition | Shape
}

interface AccessDefBase {
  allow?: string
  role?: string | string[]
  ident?: string | string[]
  roleFromField?: string
  identFromField?: string
}

export interface AccessDef extends AccessDefBase {
  actions?: Record<string, string | AccessDefBase>
}

export interface Access {
  allow?: string
  role?: string[]
  ident?: string[]
  roleFromField?: string
  identFromField?: string
}

export interface SchemaDef {
  id: string
  plural?: string
  service?: string
  generateId?: boolean
  shape?: ShapeDef
  access?: string | AccessDef
  internal?: boolean
}

export type CastFn = (
  data: unknown,
  isRev?: boolean,
  noDefaults?: boolean,
) => unknown
