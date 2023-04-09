import type { DataFunction } from '../types.js'

export interface FieldDefinition {
  $cast: string
  $default?: unknown | DataFunction
  $const?: unknown | DataFunction
}

export interface Shape {
  [key: string]: Shape | FieldDefinition | string | undefined
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
  shape?: Shape
  access?: string | AccessDef
  internal?: boolean
}
