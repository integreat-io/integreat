import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { Exchange, Data, Transporter } from '../types'
import { EndpointDef, Endpoint } from './endpoints/types'

export interface MapOptions {
  pipelines?: Record<string, MapDefinition>
  functions?: Record<string, CustomFunction>
  dictionaries?: Dictionaries
  mutateNull?: boolean
}

export type MapDefinitions = Record<string, string | MapDefinition>

export interface IdentConfig {
  type: string
  props?: {
    id?: string
    roles?: string
    tokens?: string
  }
}

export interface ExchangeMapperWithEndpoint {
  (exchange: Exchange, endpoint: Endpoint, isIncoming?: boolean): Exchange
}

export interface ExchangeMapper {
  (exchange: Exchange): Exchange
}

export interface AsyncExchangeMapper {
  (exchange: Exchange): Promise<Exchange>
}

export type AuthOptions = Record<string, Data>

export interface Authentication extends AuthOptions {
  status: string
  error?: string
}

export interface Authenticator {
  authenticate: (options: AuthOptions | null) => Promise<Authentication>
  isAuthenticated: (authentication: Authentication | null) => boolean
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

export interface ServiceDef {
  id: string
  transporter: string | Transporter
  auth?: boolean | AuthDef | string | null
  meta?: string
  options?: { [key: string]: unknown }
  mutation?: MapDefinition
  endpoints: EndpointDef[]
}

// TODO: Rethink
export interface Service {
  id: string
  meta?: string
  endpointFromExchange: (exchange: Exchange) => Endpoint | undefined
  authorizeExchange: ExchangeMapper
  mapRequest: ExchangeMapperWithEndpoint
  mapResponse: ExchangeMapperWithEndpoint
  sendExchange: AsyncExchangeMapper
}
