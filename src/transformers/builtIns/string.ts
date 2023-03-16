import mapAny = require('map-any')
import type { Transformer } from 'map-transform/types.js'
import { isDate } from '../../utils/is.js'

function castString(value: Record<string, unknown>): string | null | undefined {
  if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'object') {
    return isDate(value) ? value.toISOString() : undefined
  } else {
    return String(value)
  }
}

const string: Transformer = () => () => mapAny(castString)

export default string
