import mapAny from 'map-any'
import { isDate } from '../../utils/is.js'
import type { Transformer } from 'map-transform/types.js'

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

const date: Transformer = () => () => mapAny(castDate)

export default date
