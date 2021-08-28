import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { isDate } from '../../utils/is'

export function castDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (
    isDate(value) ||
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    const date = new Date(value)
    return !date || isNaN(date.getTime()) ? undefined : date
  } else {
    return undefined
  }
}

const date: CustomFunction = (_operands) => mapAny(castDate)

export default date
