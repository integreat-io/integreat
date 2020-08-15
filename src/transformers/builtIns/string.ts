import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { Data } from '../../types'

function castString(value: Data): string | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'object') {
    return value instanceof Date ? value.toISOString() : undefined
  } else {
    return String(value)
  }
}

const string: CustomFunction = (_operands) => mapAny(castString)

export default string
