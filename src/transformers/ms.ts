import { isDate } from '../utils/is'

export default () =>
  function formatDate(
    value: unknown,
    { rev }: { rev: boolean }
  ): number | Date | null | undefined {
    if (rev) {
      if (isDate(value)) {
        return value.getTime()
      } else if (typeof value === 'number') {
        return value
      }
    } else {
      // fwd
      if (typeof value === 'number' || isDate(value)) {
        return new Date(value)
      }
    }

    return undefined
  }
