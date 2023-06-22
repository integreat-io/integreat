import type { TransformDefinition } from 'map-transform/types.js'
import type { Condition, Adapter } from '../../types.js'

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
