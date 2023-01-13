import util = require('util')
import { validate } from 'map-transform'
import { Condition, ConditionFailObject } from '../types.js'
import { isObject } from './is.js'

export type FilterFn = (data: unknown) => boolean

type FilterAndMessage = [FilterFn, () => ConditionFailObject]

const cleanCondition = ({ onFail, ...filter }: Condition) => filter
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
    return validate({ path, schema: cleanFilter(filter) })
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
    ? filter.onFail
      ? () =>
          typeof filter.onFail === 'string'
            ? { message: filter.onFail }
            : filter.onFail
      : () => ({ message: `'${path}' did not pass ${util.inspect(filter)}` })
    : () => ({ message: `'${path}' did not pass its condition` })

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

  return function validate(data: unknown): ConditionFailObject[] {
    const failObjects = filterFns
      .map(([filter, getMessage]) => (filter(data) ? undefined : getMessage()))
      .filter(Boolean) as ConditionFailObject[]
    return isOrFilters && failObjects.length < filterFns.length
      ? []
      : failObjects
  }
}
