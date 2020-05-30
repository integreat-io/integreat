import { EndpointDef, MatchObject } from './types'
const has = (prop: unknown) => Number(!!prop)
const hasArray = (prop: unknown) => Number(Array.isArray(prop) && prop.length)
const hasParams = ({ params }: MatchObject, required: boolean) =>
  Number(
    !!params &&
      Object.values(params).filter(isRequired => isRequired === required).length
  )
const hasFilters = ({ filters }: MatchObject) =>
  Number(!!filters && Object.keys(filters).length)

export default (a: EndpointDef, b: EndpointDef) => {
  const matchA = a.match || {}
  const matchB = b.match || {}

  return (
    has(matchB.type) - has(matchA.type) ||
    hasArray(matchA.type) - hasArray(matchB.type) ||
    hasParams(matchB, true) - hasParams(matchA, true) ||
    hasParams(matchB, false) - hasParams(matchA, false) ||
    hasFilters(matchB) - hasFilters(matchA) ||
    has(matchB.scope) - has(matchA.scope) ||
    hasArray(matchA.scope) - hasArray(matchB.scope) ||
    has(matchB.action) - has(matchA.action) ||
    hasArray(matchA.action) - hasArray(matchB.action) ||
    has(a.id) - has(b.id)
  )
}
