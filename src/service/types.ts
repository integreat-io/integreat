import type { TransformDefinition, Options } from 'map-transform/types.js'
import type {
  Action,
  Response,
  Dispatch,
  Transporter,
  Adapter,
} from '../types.js'
import type { EndpointDef, Endpoint } from './endpoints/types.js'

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

export interface ActionMapperWithEndpoint {
  (action: Action, endpoint: Endpoint, isIncoming?: boolean): Action
}

export interface ActionMapper {
  (action: Action): Action
}

export interface AsyncActionMapper {
  (action: Action): Promise<Action>
}

export type AuthOptions = Record<string, unknown>

export interface Authentication extends AuthOptions {
  status: string
  error?: string
}

export interface Authenticator {
  authenticate: (
    options: AuthOptions | null,
    action: Action | null
  ) => Promise<Authentication>
  isAuthenticated: (
    authentication: Authentication | null,
    action: Action | null
  ) => boolean
  authentication: {
    [asFunction: string]: (
      authentication: Authentication | null
    ) => Record<string, unknown>
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

export interface Service {
  id: string
  meta?: string
  endpointFromAction: (
    action: Action,
    isIncoming?: boolean
  ) => Endpoint | undefined
  authorizeAction: ActionMapper
  mapRequest: ActionMapperWithEndpoint
  mapResponse: ActionMapperWithEndpoint
  send: AsyncActionMapper
  listen: (dispatch: Dispatch) => Promise<Response>
  close: () => Promise<Response>
}
