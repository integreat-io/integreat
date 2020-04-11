import { Exchange } from '../../types'
import { MapDefinitions, MapOptions } from '../types'
import { EndpointDef, EndpointOptions, Endpoint } from './types'
import createEndpoint, { PrepareOptions } from './create'
import compareEndpoints from './compare'

export default function getEndpointMapper(
  endpointDefs: EndpointDef[],
  serviceMappings: MapDefinitions,
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  prepareOptions?: PrepareOptions
) {
  const endpoints = endpointDefs
    .sort(compareEndpoints)
    .map(
      createEndpoint(
        serviceMappings,
        serviceOptions,
        mapOptions,
        prepareOptions
      )
    )

  return (exchange: Exchange): Endpoint | undefined =>
    endpoints.find((endpoint) => endpoint.isMatch(exchange))
}
