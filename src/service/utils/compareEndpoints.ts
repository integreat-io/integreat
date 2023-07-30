import type { EndpointDef, MatchObject } from '../types.js'

const has = (prop: unknown) => Number(prop !== undefined)
const hasArray = (prop: unknown) => Number(Array.isArray(prop) && prop.length)
const hasParams = ({ params }: MatchObject, required: boolean) =>
  Number(
    !!params &&
      Object.values(params).filter((isRequired) => isRequired === required)
        .length
  )
const hasFilters = ({ filters }: MatchObject) =>
  Number(!!filters && Object.keys(filters).length)

const hasConditions = ({ conditions }: MatchObject) =>
  Number(!!conditions && conditions.length)

export default (a: EndpointDef, b: EndpointDef): number => {
  const matchA = a.match || {}
  const matchB = b.match || {}

  return (
    has(matchB.incoming) - has(matchA.incoming) ||
    has(matchB.type) - has(matchA.type) ||
    hasArray(matchA.type) - hasArray(matchB.type) ||
    hasParams(matchB, true) - hasParams(matchA, true) ||
    hasParams(matchB, false) - hasParams(matchA, false) ||
    hasConditions(matchB) - hasConditions(matchA) ||
    hasFilters(matchB) - hasFilters(matchA) ||
    has(matchB.scope) - has(matchA.scope) ||
    hasArray(matchA.scope) - hasArray(matchB.scope) ||
    has(matchB.action) - has(matchA.action) ||
    hasArray(matchA.action) - hasArray(matchB.action) ||
    has(a.id) - has(b.id)
  )
}
