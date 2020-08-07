import { MapDefinition } from 'map-transform'
import { Exchange } from '../../types'

export type EndpointOptions = Record<string, unknown>

export type JsonSchema = Record<string, unknown> | boolean

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: Record<string, boolean | undefined>
  filters?: Record<string, JsonSchema | undefined>
}

export interface EndpointDef {
  id?: string
  match?: MatchObject
  validate?: MapDefinition
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
  mutateRequest: (exchange: Exchange) => Exchange
  mutateResponse: (exchange: Exchange) => Exchange
  isMatch: (exchange: Exchange) => boolean
  allowRawRequest?: boolean
  allowRawResponse?: boolean
}
