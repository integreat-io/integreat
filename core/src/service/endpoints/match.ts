import { validate } from 'map-transform'
import { Exchange, Params } from '../../types'
import { EndpointDef } from './types'
import { arrayIncludes } from '../../utils/array'

type FilterFn = (exchange: Exchange) => boolean

const matchValue = (match?: string | string[], value?: string | string[]) =>
  arrayIncludes(match, value)

const hasParam = (params: Params | undefined, key: string) =>
  params && params[key] !== undefined // eslint-disable-line security/detect-object-injection

const matchId = (endpoint: EndpointDef, { endpointId }: Exchange) =>
  !endpointId || endpoint.id === endpointId

const matchType = ({ match = {} }: EndpointDef, { request }: Exchange) =>
  !match.type || matchValue(match.type, request.type)

const matchScope = ({ match = {} }: EndpointDef, { request }: Exchange) =>
  !match.scope ||
  matchValue(
    match.scope,
    request.id
      ? Array.isArray(request.id)
        ? 'members'
        : 'member'
      : 'collection'
  )

const matchAction = ({ match = {} }: EndpointDef, { type }: Exchange) =>
  !match.action || matchValue(match.action, type)

const matchParams = (
  { match: { params } = {} }: EndpointDef,
  { request }: Exchange
) =>
  typeof params !== 'object' ||
  params === null ||
  Object.entries(params).every(
    // eslint-disable-next-line security/detect-object-injection
    ([key, isRequired]) => !isRequired || hasParam(request.params, key)
  )

const matchFilters = (filters: FilterFn[], exchange: Exchange) =>
  filters.every((filter) => filter(exchange))

/**
 * Return the first matching endpoint from an array of endpoints that has
 * already been sortert with higher specificity first. Type should match before
 * scope, which should match before action, but the order here is taken care of
 * by the required sorting.
 */
export default function isMatch(
  endpoint: EndpointDef
): (exchange: Exchange) => boolean {
  const match = endpoint.match || {}
  const filters = match.filters
    ? (Object.entries(match.filters).map(([path, filter]) =>
        filter ? validate(path, filter) : undefined
      ) as FilterFn[])
    : []

  return (exchange) =>
    matchId(endpoint, exchange) &&
    matchType(endpoint, exchange) &&
    matchScope(endpoint, exchange) &&
    matchAction(endpoint, exchange) &&
    matchParams(endpoint, exchange) &&
    matchFilters(filters, exchange)
}
