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
  requestMapping?: MapDefinition // TODO: Remove
  responseMapping?: MapDefinition // TODO: Remove
  sendNoDefaults?: boolean
  returnNoDefaults?: boolean
  mappings?: Dictionary<string | MapDefinition> // TODO: Remove
}

export interface Endpoint {
  id?: string
  match?: MatchObject
  options: EndpointOptions
  mapRequest: (exchange: Exchange) => Exchange // TODO: Remove
  mapResponse: (exchange: Exchange) => Exchange // TODO: Remove
  mutateRequest: (exchange: Exchange) => Exchange
  mutateResponse: (exchange: Exchange) => Exchange
  validate: (exchange: Exchange) => Exchange // TODO: Remove
  isMatch: (exchange: Exchange) => boolean
}
