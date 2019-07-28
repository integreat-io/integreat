import mapAny = require('map-any')
import { GenericData } from '../../types'

function castString (value: GenericData): string | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'object') {
    return (value instanceof Date) ? value.toISOString() : undefined
  } else {
    return String(value)
  }
}

export default function string (_operands: object) {
  return mapAny(castString)
}
