import mapAny = require('map-any')
import type { Transformer } from 'map-transform/types.js'
import { isObject } from '../../utils/is.js'

const castObject = (value: unknown) => {
  if (isObject(value)) {
    return value
  } else {
    return undefined
  }
}

const object: Transformer = (_operands) => mapAny(castObject)

export default object
