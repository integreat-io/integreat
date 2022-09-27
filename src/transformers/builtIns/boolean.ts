import mapAny = require('map-any')
import { CustomFunction } from 'map-transform'

const castBoolean = (value: unknown) => {
  if (value === null || value === undefined) {
    return value
  } else {
    return value === 'false' ? false : Boolean(value)
  }
}

const boolean: CustomFunction = (_operands) => mapAny(castBoolean)

export default boolean
