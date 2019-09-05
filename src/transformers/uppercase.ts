import mapAny = require('map-any')
import { Data, DataObject } from '../types'

function uppercase(value: Data) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

export default (_operands: DataObject) => mapAny(uppercase)
