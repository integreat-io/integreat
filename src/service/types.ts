import {
  MapTransform,
  MapDefinition,
  CustomFunction,
  Dictionaries,
} from 'map-transform'
import { Request, Response, Exchange, Dictionary, Data } from '../types'
import { EndpointDef, EndpointOptions } from './endpoints/types'

export interface Connection extends Dictionary<unknown> {
  status: string
}

export interface Adapter {
  authentication: string
  prepareEndpoint: (
    options: EndpointOptions,
    serviceOptions?: EndpointOptions
  ) => EndpointOptions
  connect: (
    options: EndpointOptions,
    authentication: object | null,
    connection: Connection | null
  ) => Promise<Connection | null>
  disconnect: (connection: Connection | null) => Promise<void>
  send: (request: Request, connection: Connection | null) => Promise<Response>
}

export interface Mappings {
  [type: string]: MapTransform
}

export interface MapOptions {
  pipelines?: Dictionary<MapDefinition>
  functions?: Dictionary<CustomFunction>
  dictionaries?: Dictionaries
}

export type MapDefinitions = Dictionary<string | MapDefinition>

// TODO: Rethink
export interface MappingDef {
  id: string
  type?: string
  service?: string
  mapping: MapDefinition
}

export interface IdentConfig {
  type: string
  props?: {
    id?: string
    roles?: string
    tokens?: string
  }
}

export interface SendOptions {
  request: Request
  response?: Response
  mappings: Mappings // TODO: Remove
  responseMapper?: MapTransform // TODO: Remove
  requestMapper?: MapTransform // TODO: Remove
  mutator: MapTransform
}

export interface ExchangeMapper {
  (exchange: Exchange): Exchange
}

export interface AsyncExchangeMapper {
  (exchange: Exchange): Promise<Exchange>
}

export type AuthOptions = Dictionary<Data>

export interface Authentication extends AuthOptions {
  status: string
  error?: string
}

export interface Authenticator {
  authenticate: (options: AuthOptions | null) => Promise<Authentication>
  isAuthenticated: (authentication: Authentication | null) => boolean
  authentication: {
    [asFunction: string]: (authentication: Authentication | null) => object
  }
}

export interface AuthDef {
  id: string
  authenticator: string
  options: AuthOptions
}

export interface ServiceDef {
  id: string
  adapter: string | Adapter
  auth?: boolean | AuthDef | string | null
  meta?: string
  options?: { [key: string]: unknown }
  mutation?: MapDefinition
  endpoints: EndpointDef[]
  mappings: MapDefinitions // TODO: Remove
}

// TODO: Rethink
export interface Service {
  id: string
  meta?: string
  assignEndpointMapper: ExchangeMapper
  authorizeExchange: ExchangeMapper
  mapRequest: ExchangeMapper
  mapResponse: ExchangeMapper
  sendExchange: AsyncExchangeMapper
}
