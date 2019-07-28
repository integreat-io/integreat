import mapAny = require('map-any')
import { GenericData } from '../../types'

const castBoolean = (value: GenericData) => {
  if (value === null || value === undefined) {
    return value
  } else {
    return (value === 'false') ? false : Boolean(value)
  }
}

export default function (_operands: object) {
  return mapAny(castBoolean)
}
