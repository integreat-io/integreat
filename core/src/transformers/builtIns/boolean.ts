import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'
import { Data } from '../../types'

const castBoolean = (value: Data) => {
  if (value === null || value === undefined) {
    return value
  } else {
    return value === 'false' ? false : Boolean(value)
  }
}

const boolean: CustomFunction = (_operands) => mapAny(castBoolean)

export default boolean
