import { MapDefinition } from 'map-transform'
import { Action } from '../../types.js'
import { MapOptions } from '../types.js'
import { EndpointDef, EndpointOptions, Endpoint } from './types.js'
import createEndpoint, { PrepareOptions } from './create.js'
import compareEndpoints from './compare.js'

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
