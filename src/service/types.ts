import type { TransformDefinition } from 'map-transform/types.js'
import type {
  Action,
  Transporter,
  Adapter,
  Condition,
  ValidateObject,
} from '../types.js'

export type TransformDefinitions = Record<string, string | TransformDefinition>

export interface IdentConfig {
  type: string
  props?: {
    id?: string
    roles?: string
    tokens?: string
  }
}

export interface ActionMapper {
  (action: Action): Action
}

export type AuthOptions = Record<string, unknown>

export interface Authentication extends Record<string, unknown> {
  status: string
  error?: string
  authKey?: string
}

export interface AuthDef {
  id: string
  authenticator: string
  options: AuthOptions
  overrideAuthAsMethod?: string
}

export type AuthProp = AuthDef | string | boolean | null

export interface AuthObject {
  incoming?: AuthProp | AuthProp[]
  outgoing?: AuthProp
}

export interface TransporterOptions extends Record<string, unknown> {
  incoming?: Record<string, unknown>
}

export interface ServiceOptions extends TransporterOptions {
  transporter?: TransporterOptions
  adapters?: Record<string, Record<string, unknown>>
}

export interface PreparedOptions {
  transporter: TransporterOptions
  adapters?: Record<string, Record<string, unknown>>
}

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: Record<string, boolean | undefined>
  conditions?: TransformDefinition[]
  filters?: Record<string, Condition | boolean | undefined>
  incoming?: boolean
}

export interface EndpointDef {
  id?: string
  adapters?: (string | Adapter)[]
  auth?: AuthObject | AuthProp
  match?: MatchObject
  validate?: ValidateObject[]
  mutation?: TransformDefinition
  mutate?: TransformDefinition
  allowRawRequest?: boolean
  allowRawResponse?: boolean
  castWithoutDefaults?: boolean
  options?: ServiceOptions
}

export interface ServiceDef {
  id: string
  transporter?: string | Transporter
  adapters?: (string | Adapter)[]
  auth?: AuthObject | AuthProp
  meta?: string
  options?: ServiceOptions
  mutation?: TransformDefinition
  endpoints: EndpointDef[]
}
