import { CronExpressionParser } from 'cron-parser'
import { isDate } from '../utils/is.js'
import type { JobDef } from './types.js'

export default class Schedule {
  cron?: string
  tz?: string

  constructor(job: JobDef) {
    this.cron = typeof job.cron === 'string' ? job.cron : undefined
    this.tz = typeof job.tz === 'string' ? job.tz : undefined
  }

  shouldRun(start: Date, end: Date) {
    if (typeof this.cron === 'string') {
      if (
        !isDate(start) ||
        !isDate(end) ||
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        throw new Error('Missing start or end date')
      }

      const options = { currentDate: start, endDate: end, tz: this.tz }
      const interval = CronExpressionParser.parse(this.cron, options)

      try {
        interval.next() // Will throw if not within interval
        return true // Did not throw, so the schedule should run
      } catch {
        return false
      }
    }

    return false // Not a cron string or the job should not run within the given interval
  }
}
