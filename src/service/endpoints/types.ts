import type { MapDefinition } from 'map-transform/types.js'
import { Action, Condition } from '../../types.js'

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
  mutation?: MapDefinition
  sendNoDefaults?: boolean
  returnNoDefaults?: boolean
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}

export interface Endpoint {
  id?: string
  match?: MatchObject
  options: EndpointOptions
  mutateRequest: (action: Action, isIncoming?: boolean) => Action
  mutateResponse: (action: Action, isIncoming?: boolean) => Action
  isMatch: (action: Action, isIncoming?: boolean) => boolean
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}
