import debugFn from 'debug'
import Luxon = require('luxon')
const { DateTime } = Luxon

const debug = debugFn('crazy')

export interface Operands {
  format?: string
}

function createDate(value: unknown, format: string) {
  if (value instanceof Date) {
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
  } else if (value instanceof Date) {
    return value
  } else {
    let date = createDate(value, format)
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
  debug(
    '*** formatDate before:',
    value,
    JSON.stringify(value),
    typeof value,
    value instanceof Date
  )
  const date = createDate(value, format)
  debug('*** formatDate after:', value, JSON.stringify(value), typeof value)
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
