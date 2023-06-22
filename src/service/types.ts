import type { TransformDefinition, Options } from 'map-transform/types.js'
import type { Action, Transporter, Adapter, Condition } from '../types.js'

export type MapOptions = Options

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
}

export interface Authenticator<T extends Authentication = Authentication> {
  authenticate: (
    options: AuthOptions | null,
    action: Action | null
  ) => Promise<T>
  isAuthenticated: (authentication: T | null, action: Action | null) => boolean
  authentication: {
    [asFunction: string]: (authentication: T | null) => Record<string, unknown>
  }
}

export interface AuthDef {
  id: string
  authenticator: string
  options: AuthOptions
}

export type AuthProp = AuthDef | string | boolean | null

export interface AuthObject {
  incoming?: AuthProp
  outgoing?: AuthProp
}

export type EndpointOptions = Record<string, unknown>

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: Record<string, boolean | undefined>
  filters?: Record<string, Condition | boolean | undefined>
  incoming?: boolean
}

export interface EndpointDef {
  id?: string
  match?: MatchObject
  options?: EndpointOptions
  mutation?: TransformDefinition
  adapters?: (string | Adapter)[]
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}

export interface ServiceDef {
  id: string
  transporter?: string | Transporter
  adapters?: (string | Adapter)[]
  auth?: AuthObject | AuthProp
  meta?: string
  options?: Record<string, unknown>
  mutation?: TransformDefinition
  endpoints: EndpointDef[]
}
