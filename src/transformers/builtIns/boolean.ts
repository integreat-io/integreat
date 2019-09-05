import mapAny = require('map-any')
import { Data } from '../../types'

const castBoolean = (value: Data) => {
  if (value === null || value === undefined) {
    return value
  } else {
    return (value === 'false') ? false : Boolean(value)
  }
}

export default function (_operands: object) {
  return mapAny(castBoolean)
}
