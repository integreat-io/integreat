import mapTransform from 'map-transform'
import validateFilters from '../../utils/validateFilters.js'
import { arrayIncludes } from '../../utils/array.js'
import type { TransformDefinition } from 'map-transform/types.js'
import type { Action, MapOptions, Params } from '../../types.js'
import type { EndpointDef } from '../types.js'

function createConditionsValidator(
  conditions: TransformDefinition[] | undefined,
  mapOptions: MapOptions
): (action: Action) => Promise<boolean> {
  if (!conditions) {
    return async () => true
  }

  const validators = conditions.map((condition) =>
    mapTransform(condition, mapOptions)
  )
  return async function validateConditions(action) {
    for (const validator of validators) {
      if (!(await validator(action, { rev: false }))) {
        return false
      }
    }
    return true
  }
}

const matchValue = (match?: string | string[], value?: string | string[]) =>
  arrayIncludes(match, value)

const hasParam = (params: Params | undefined, key: string) =>
  params && params[key] !== undefined // eslint-disable-line security/detect-object-injection

const matchId = (
  endpoint: EndpointDef,
  { payload: { endpoint: endpointId } = {} }: Action
) => !endpointId || endpoint.id === endpointId

const matchType = ({ match = {} }: EndpointDef, { payload }: Action) =>
  !match.type || matchValue(match.type, payload.type)

const matchScope = ({ match = {} }: EndpointDef, { payload }: Action) =>
  !match.scope ||
  matchValue(
    match.scope,
    payload.id
      ? Array.isArray(payload.id)
        ? 'members'
        : 'member'
      : 'collection'
  )

const matchAction = ({ match = {} }: EndpointDef, { type }: Action) =>
  !match.action || matchValue(match.action, type)

const matchParams = (
  { match: { params } = {} }: EndpointDef,
  { payload }: Action
) =>
  typeof params !== 'object' ||
  params === null ||
  Object.entries(params).every(
    ([key, isRequired]) => !isRequired || hasParam(payload, key)
  )

const matchIncoming = (
  { match: { incoming: incomingEndpoint } = {} }: EndpointDef,
  isIncoming: boolean
) => incomingEndpoint === undefined || incomingEndpoint === isIncoming

/**
 * Return the first matching endpoint from an array of endpoints that has
 * already been sortert with higher specificity first. Type should match before
 * scope, which should match before action, but the order here is taken care of
 * by the required sorting.
 */
export default function isMatch(
  endpoint: EndpointDef,
  mapOptions: MapOptions
): (action: Action, isIncoming?: boolean) => Promise<boolean> {
  const match = endpoint.match || {}
  const matchFilters = match.filters
    ? validateFilters(match.filters)
    : async () => []
  const matchConditions = createConditionsValidator(
    match.conditions,
    mapOptions
  )

  return async (action, isIncoming = false) =>
    matchId(endpoint, action) &&
    matchType(endpoint, action) &&
    matchScope(endpoint, action) &&
    matchAction(endpoint, action) &&
    matchParams(endpoint, action) &&
    matchIncoming(endpoint, isIncoming) &&
    (await matchConditions(action)) &&
    (await matchFilters(action)).length === 0 // Not too pretty
}
