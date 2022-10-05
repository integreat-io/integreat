import util = require('util')
import { validate } from 'map-transform'
import { Condition } from '../types'
import { isObject } from './is'

export type FilterFn = (data: unknown) => boolean

type FilterAndMessage = [FilterFn, () => string]

const cleanCondition = ({ failMessage, ...filter }: Condition) => filter
const cleanFilter = (filter: Condition | boolean) =>
  isObject(filter) ? cleanCondition(filter) : filter

function prepareFilter(
  path: string,
  filter?: Record<string, unknown> | boolean
) {
  if (path === '$or') {
    if (isObject(filter)) {
      return validateFilters({ $or: true, ...filter })
    }
  } else if (filter) {
    return validate(path, cleanFilter(filter))
  }
  return undefined
}

const prepareMessage = (
  path: string,
  filter: Condition | boolean | undefined,
  useFriendlyMessages: boolean
) =>
  !useFriendlyMessages
    ? () => path
    : isObject(filter)
    ? filter.failMessage
      ? () => filter.failMessage
      : () => `'${path}' did not pass ${util.inspect(filter)}`
    : () => `'${path}' did not pass its condition`

export default function validateFilters(
  filters: Record<string, Condition | boolean | undefined>,
  useFriendlyMessages = false
) {
  const filterFns = Object.entries(filters)
    .map(([path, filter]) => [
      prepareFilter(path, filter),
      prepareMessage(path, filter, useFriendlyMessages),
    ])
    .filter(([filter]) => !!filter) as FilterAndMessage[]
  const isOrFilters = filters.$or === true

  return function validate(data: unknown): string[] {
    const errors = filterFns
      .map(([filter, getMessage]) => (filter(data) ? undefined : getMessage()))
      .filter(Boolean) as string[]
    return isOrFilters && errors.length < filterFns.length ? [] : errors
  }
}
