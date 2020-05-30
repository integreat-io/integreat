import { MapDefinition } from 'map-transform'
import { Dictionary, Exchange } from '../../types'

export type EndpointOptions = Dictionary<unknown>

export type JsonSchema = object | string | boolean

export interface MatchObject {
  action?: string | string[]
  type?: string | string[]
  scope?: string | string[]
  params?: { [key: string]: boolean }
  filters?: Dictionary<JsonSchema>
}

export interface EndpointDef {
  id?: string
  match?: MatchObject
  validate?: MapDefinition
  options?: EndpointOptions
  mutation?: MapDefinition
  sendNoDefaults?: boolean
  returnNoDefaults?: boolean
}

export interface Endpoint {
  id?: string
  match?: MatchObject
  options: EndpointOptions
  mutateRequest: (exchange: Exchange) => Exchange
  mutateResponse: (exchange: Exchange) => Exchange
  isMatch: (exchange: Exchange) => boolean
}
