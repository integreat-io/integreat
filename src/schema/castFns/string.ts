import { isDate } from '../../utils/is.js'

export default function castString(value: unknown) {
  if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'object') {
    return isDate(value) ? value.toISOString() : undefined
  } else {
    return String(value)
  }
}
