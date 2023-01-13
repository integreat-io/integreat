import validateFilters from '../../utils/validateFilters.js'
import { Action, Params } from '../../types.js'
import { EndpointDef } from './types.js'
import { arrayIncludes } from '../../utils/array.js'

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
  endpoint: EndpointDef
): (action: Action, isIncoming?: boolean) => boolean {
  const match = endpoint.match || {}
  const matchFilters = match.filters ? validateFilters(match.filters) : () => []

  return (action, isIncoming = false) =>
    matchId(endpoint, action) &&
    matchType(endpoint, action) &&
    matchScope(endpoint, action) &&
    matchAction(endpoint, action) &&
    matchParams(endpoint, action) &&
    matchIncoming(endpoint, isIncoming) &&
    matchFilters(action).length === 0 // Not too pretty
}
