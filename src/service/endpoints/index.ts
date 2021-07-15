import { MapDefinition } from 'map-transform'
import { Action } from '../../types'
import { MapOptions } from '../types'
import { EndpointDef, EndpointOptions, Endpoint } from './types'
import createEndpoint, { PrepareOptions } from './create'
import compareEndpoints from './compare'

export default function createEndpointMappers(
  serviceId: string,
  endpointDefs: EndpointDef[],
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: MapDefinition,
  prepareOptions?: PrepareOptions
): (action: Action, isIncoming?: boolean) => Endpoint | undefined {
  const endpoints = endpointDefs
    .sort(compareEndpoints)
    .map(
      createEndpoint(
        serviceId,
        serviceOptions,
        mapOptions,
        serviceMutation,
        prepareOptions
      )
    )

  return (action, isIncoming) =>
    endpoints.find((endpoint) => endpoint.isMatch(action, isIncoming))
}
