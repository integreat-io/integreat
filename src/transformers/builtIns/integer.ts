import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { isDate } from '../../utils/is'
import { Data } from '../../types'

const numberOrUndefined = (value: number) => (isNaN(value) ? undefined : value)

function castInteger(value: Data): number | null | undefined {
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : Math.round(value)
  } else if (typeof value === 'string') {
    return numberOrUndefined(Number.parseInt(value, 10))
  } else if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'boolean') {
    return Number(value)
  } else if (isDate(value)) {
    return numberOrUndefined(value.getTime())
  } else {
    return undefined
  }
}

const integer: CustomFunction = (_operands) => mapAny(castInteger)

export default integer
