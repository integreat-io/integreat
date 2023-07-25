import cronParser from 'cron-parser'
import { isDate, isAction } from './is.js'
import type { JobDef, Action } from '../types.js'

export default class Schedule {
  action: Action | null
  cron?: string
  tz?: string

  constructor(job: JobDef) {
    this.action = isAction(job.action) ? job.action : null
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
      const interval = cronParser.parseExpression(this.cron, options)

      try {
        interval.next() // Will throw if not within interval
        return true // Did not throw, so the schedule should run
      } catch {} // Threw, so fall back to false below
    }

    return false // Not a cron string or the job should not run within the given interval
  }
}
