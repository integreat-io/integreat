import { validate } from 'map-transform'
import { JsonSchema } from '../types'
import { isObject } from './is'

export type FilterFn = (data: unknown) => boolean

function prepareFilter(path: string, filter?: JsonSchema) {
  if (path === '$or') {
    if (isObject(filter)) {
      return validateFilters({ $or: true, ...filter })
    }
  } else if (filter) {
    return validate(path, filter)
  }
  return undefined
}

export default function validateFilters(
  filters: Record<string, JsonSchema | undefined>
) {
  const filterFns = Object.entries(filters)
    .map(([path, filter]) => prepareFilter(path, filter))
    .filter(Boolean) as FilterFn[]
  const isOrFilters = filters.$or === true

  return function validate(data: unknown) {
    return isOrFilters
      ? filterFns.some((filter) => filter(data))
      : filterFns.every((filter) => filter(data))
  }
}
