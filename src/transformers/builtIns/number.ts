import mapAny = require('map-any')
import { Transformer } from 'map-transform'
import { isDate } from '../../utils/is.js'

const numberOrUndefined = (value: number) => (isNaN(value) ? undefined : value)

export function castNumber(value: unknown): number | null | undefined {
  if (typeof value === 'number') {
    return numberOrUndefined(value)
  } else if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'string') {
    return numberOrUndefined(Number.parseFloat(value))
  } else if (typeof value === 'boolean') {
    return Number(value)
  } else if (isDate(value)) {
    return numberOrUndefined(value.getTime())
  } else {
    return undefined
  }
}

const number: Transformer = (_operands) => mapAny(castNumber)

export default number
