import type { TransformDefinition } from 'map-transform/types.js'
import type { Action, Response, Condition, Adapter } from '../../types.js'

export type EndpointOptions = Record<string, unknown>

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: Record<string, boolean | undefined>
  filters?: Record<string, Condition | boolean | undefined>
  incoming?: boolean
}

export interface ValidateObject {
  condition: TransformDefinition
  failResponse?: Response
}

export interface EndpointDef {
  id?: string
  match?: MatchObject
  validate?: ValidateObject[]
  options?: EndpointOptions
  mutation?: TransformDefinition
  adapters?: (string | Adapter)[]
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}

export interface Endpoint {
  id?: string
  match?: MatchObject
  options: EndpointOptions
  validateAction: (action: Action) => Promise<Response | null>
  mutateRequest: (action: Action, isIncoming?: boolean) => Promise<Action>
  mutateResponse: (action: Action, isIncoming?: boolean) => Promise<Action>
  isMatch: (action: Action, isIncoming?: boolean) => boolean
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}
