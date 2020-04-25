import mapAny = require('map-any')
import { Data } from '../../types'

function castDate(value: Data): Date | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (
    value instanceof Date ||
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    const date = new Date(value)
    return !date || isNaN(date.getTime()) ? undefined : date
  } else {
    return undefined
  }
}

export default function date(_operands: object) {
  return mapAny(castDate)
}
