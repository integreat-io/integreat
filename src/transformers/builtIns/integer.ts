import mapAny = require('map-any')
import { GenericData } from '../../types'

const numberOrUndefined = (value: number) => (isNaN(value) ? undefined : value)

function castInteger(value: GenericData): number | null | undefined {
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : Math.round(value)
  } else if (typeof value === 'string') {
    return numberOrUndefined(Number.parseInt(value, 10))
  } else if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'boolean') {
    return Number(value)
  } else if (value instanceof Date) {
    return numberOrUndefined(value.getTime())
  } else {
    return undefined
  }
}

export default function integer(_operands: object) {
  return mapAny(castInteger)
}
