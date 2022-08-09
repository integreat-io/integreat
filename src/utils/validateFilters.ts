import { validate } from 'map-transform'
import { JsonSchema } from '../types'

export type FilterFn = (data: unknown) => boolean

export default function validateFilters(
  filters: Record<string, JsonSchema | undefined>
) {
  const filterFns = Object.entries(filters)
    .filter(([path]) => path !== '$or')
    .map(([path, filter]) => (filter ? validate(path, filter) : undefined))
    .filter(Boolean) as FilterFn[]
  const isOrFilters = filters.$or === true

  return function validate(data: unknown) {
    return isOrFilters
      ? filterFns.some((filter) => filter(data))
      : filterFns.every((filter) => filter(data))
  }
}
