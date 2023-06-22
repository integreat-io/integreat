import type { TransformDefinition } from 'map-transform/types.js'
import type { Action, Adapter } from '../../types.js'
import type { MapOptions } from '../types.js'
import type {
  EndpointDef,
  MatchObject,
  EndpointOptions,
  Endpoint,
} from './types.js'
import createEndpoint, { PrepareOptions } from './create.js'
import compareEndpoints from './compare.js'

const prepareMatch = ({ scope, ...match }: MatchObject) =>
  scope === 'all' ? match : { scope, ...match }

const prepareEndpoint = ({ match, ...endpoint }: EndpointDef) => ({
  match: prepareMatch(match || {}),
  ...endpoint,
})

export function endpointForAction(
  action: Action,
  endpoints: Endpoint[],
  isIncoming?: boolean
): Endpoint | undefined {
  return endpoints.find((endpoint) => endpoint.isMatch(action, isIncoming))
}

export default function createEndpoints(
  serviceId: string,
  endpointDefs: EndpointDef[],
  serviceOptions: EndpointOptions,
  mapOptions: MapOptions,
  serviceMutation?: TransformDefinition,
  prepareOptions?: PrepareOptions,
  serviceAdapters?: Adapter[]
): Endpoint[] {
  return endpointDefs
    .map(prepareEndpoint)
    .sort(compareEndpoints)
    .map(
      createEndpoint(
        serviceId,
        serviceOptions,
        mapOptions,
        serviceMutation,
        prepareOptions,
        serviceAdapters
      )
    )
}
