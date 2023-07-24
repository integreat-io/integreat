import { isObject } from '../../utils/is.js'

export default function castObject(value: unknown) {
  if (isObject(value)) {
    return value
  } else {
    return undefined
  }
}
