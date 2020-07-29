import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
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

const date: CustomFunction = (_operands) => mapAny(castDate)

export default date
