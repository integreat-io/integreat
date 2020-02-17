import { MapTransform } from 'map-transform'
import { Request, Response, Exchange } from '../types'

export interface Mappings {
  [type: string]: MapTransform
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
