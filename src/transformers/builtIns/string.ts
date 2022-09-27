import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { isDate } from '../../utils/is'

function castString(value: Record<string, unknown>): string | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'object') {
    return isDate(value) ? value.toISOString() : undefined
  } else {
    return String(value)
  }
}

const string: CustomFunction = (_operands) => mapAny(castString)

export default string
