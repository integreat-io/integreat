import { MapDefinition } from 'map-transform'
import { Dictionary, Data } from '../types'

export type EndpointOptions = Dictionary<Data>

export interface MatchObject {
  action?: string
  type?: string
  scope?: string
  params?: { [key: string]: boolean }
  filters?: Dictionary<object>
}

export interface EndpointDef {
  id?: string
  match?: MatchObject
  validate?: MapDefinition
  options?: EndpointOptions
  requestMapping?: MapDefinition
  responseMapping?: MapDefinition
  incoming?: boolean
  mappings?: Dictionary<string | MapDefinition>
}
