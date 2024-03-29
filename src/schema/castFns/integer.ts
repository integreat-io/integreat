import { isDate } from '../../utils/is.js'

const numberOrUndefined = (value: number) => (isNaN(value) ? undefined : value)

export default function castInteger(value: unknown): number | null | undefined {
  if (typeof value === 'number') {
    return isNaN(value) ? undefined : Math.round(value)
  } else if (typeof value === 'string') {
    return numberOrUndefined(Number.parseInt(value, 10))
  } else if (value === null || value === undefined) {
    return value
  } else if (typeof value === 'boolean') {
    return Number(value)
  } else if (isDate(value)) {
    return numberOrUndefined(value.getTime())
  } else {
    return undefined
  }
}
