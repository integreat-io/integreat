import mapAny from 'map-any'
import type { Transformer } from 'map-transform/types.js'

const castBoolean = (value: unknown) => {
  if (value === null || value === undefined) {
    return value
  } else {
    return value === 'false' ? false : Boolean(value)
  }
}

const boolean: Transformer = () => () => mapAny(castBoolean)

export default boolean
