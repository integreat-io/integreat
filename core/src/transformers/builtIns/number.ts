import mapAny = require('map-any')
import { Data } from '../../types'

const numberOrUndefined = (value: number) => (isNaN(value) ? undefined : value)

function castNumber(value: Data): number | null | undefined {
  if (typeof value === 'number') {
    return numberOrUndefined(value)
  } else if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'string') {
    return numberOrUndefined(Number.parseFloat(value))
  } else if (typeof value === 'boolean') {
    return Number(value)
  } else if (value instanceof Date) {
    return numberOrUndefined(value.getTime())
  } else {
    return undefined
  }
}

export default function number(
  _operands: Record<string, unknown>
): (data: Data) => Data {
  return mapAny(castNumber)
}
