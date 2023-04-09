import later from 'later'
import { isObject } from './is.js'
import type { ScheduleObject, JobDef, Action } from '../types.js'

later.date.UTC()

export interface Schedule {
  later: later.Schedule
  action: Action
}

function parseSched(
  schedules?: ScheduleObject[],
  exceptions?: ScheduleObject[],
  cron?: string,
  human?: string
) {
  if (schedules) {
    return { schedules, exceptions }
  } else if (typeof cron === 'string') {
    return later.parse.cron(cron)
  } else if (human) {
    return later.parse.text(human)
  }
  return null
}

export default function createSchedule(job: JobDef): Schedule | undefined {
  if (isObject(job.action)) {
    const schedule = parseSched(
      job.schedules,
      job.exceptions,
      job.cron,
      job.human
    )
    return schedule
      ? { later: later.schedule(schedule), action: job.action }
      : undefined
  } else return undefined
}
