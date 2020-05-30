import mapAny = require('map-any')
import { DataObject } from '../types'

function uppercase(value: unknown) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

export default (_operands: DataObject) => mapAny(uppercase)
