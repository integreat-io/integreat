import { isDate } from '../utils/is'
import Luxon = require('luxon')
const { DateTime } = Luxon

export interface Operands {
  format?: string
}

function createDate(value: unknown, format: string) {
  if (isDate(value)) {
    return DateTime.fromJSDate(value)
  } else if (typeof value === 'string') {
    let date = DateTime.fromFormat(value, format)
    if (!date.isValid) {
      date = DateTime.fromISO(value) // Try ISO format as a fallback
    }
    return date
  } else if (typeof value === 'number') {
    return DateTime.fromMillis(value)
  }
  return undefined
}

function formatDateFwd(value: unknown, format: string) {
  if (value === null) {
    return null
  } else if (isDate(value)) {
    return value
  } else {
    const date = createDate(value, format)
    if (date && date.isValid) {
      return date.toJSDate()
    }
  }
  return undefined
}

function formatDateRev(value: unknown, format: string) {
  if (value === null || value === undefined) {
    return value
  }
  const date = createDate(value, format)
  if (!date || !date.isValid) {
    return undefined
  }
  return format === 'ISO' ? date.setZone('utc').toISO() : date.toFormat(format)
}

export default ({ format = 'ISO' }: Operands) =>
  function formatDate(
    value: unknown,
    { rev }: { rev: boolean }
  ): string | Date | null | undefined {
    return rev ? formatDateRev(value, format) : formatDateFwd(value, format)
  }
