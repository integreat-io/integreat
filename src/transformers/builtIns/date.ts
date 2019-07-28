import mapAny = require('map-any')
import { GenericData } from '../../types'

function castDate(value: GenericData): Date | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return (!date || isNaN(date.getTime())) ? undefined : date
  } else {
    return undefined
  }
}

export default function date(_operands: object) {
  return mapAny(castDate)
}
