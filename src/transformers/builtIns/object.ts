import mapAny from 'map-any'
import { isObject } from '../../utils/is.js'
import type { Transformer } from 'map-transform/types.js'

const castObject = (value: unknown) => {
  if (isObject(value)) {
    return value
  } else {
    return undefined
  }
}

const object: Transformer = () => () => mapAny(castObject)

export default object
