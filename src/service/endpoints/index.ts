import { Exchange } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, EndpointOptions, Endpoint } from './types'
import createEndpoint, { PrepareOptions } from './create'
import compareEndpoints from './compare'

export default function createEndpointMappers(
  endpointDefs: EndpointDef[],
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  prepareOptions?: PrepareOptions
) {
  const endpoints = endpointDefs
    .sort(compareEndpoints)
    .map(createEndpoint(serviceOptions, mapOptions, prepareOptions))

  return (exchange: Exchange): Endpoint | undefined =>
    endpoints.find((endpoint) => endpoint.isMatch(exchange))
}
