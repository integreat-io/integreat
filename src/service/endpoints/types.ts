import { MapDefinition } from 'map-transform'
import { Action } from '../../types'

export type EndpointOptions = Record<string, unknown>

export type JsonSchema = Record<string, unknown> | boolean

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: Record<string, boolean | undefined>
  filters?: Record<string, JsonSchema | undefined>
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
