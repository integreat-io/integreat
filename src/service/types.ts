import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { MapTransform } from 'map-transform'
import { Request, Response, Exchange, Dictionary } from '../types'
import { EndpointDef, EndpointOptions } from './endpoints/types'
import { AuthDef, Authentication } from '../auth/types'

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
    authentication: Authentication | null,
    connection: Connection | null
  ) => Promise<Connection | null>
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
    roles?: string | string[]
    tokens?: string
  }
}

export interface SendOptions {
  request: Request
  response?: Response
  mappings: Mappings
  responseMapper?: MapTransform
  requestMapper?: MapTransform
}

export interface ExchangeMapper {
  (exchange: Exchange): Exchange
}

export interface AsyncExchangeMapper {
  (exchange: Exchange): Promise<Exchange>
}

export interface Service {
  id: string
  meta?: string
  assignEndpointMapper: ExchangeMapper
  authorizeExchange: ExchangeMapper
  mapFromService: ExchangeMapper
  mapToService: ExchangeMapper
  sendExchange: AsyncExchangeMapper
}

export interface ServiceDef {
  id: string
  adapter: string | Adapter
  auth?: AuthDef | string | null
  meta?: string
  options?: { [key: string]: unknown }
  endpoints: EndpointDef[]
  mappings: MapDefinitions
}
