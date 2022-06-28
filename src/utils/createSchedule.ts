import later = require('later')
import { ScheduleObject, JobDef, Action } from '../types'
import { isAction } from './is'

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

export default function createSchedule({
  schedules,
  exceptions,
  cron,
  human,
  action,
}: JobDef): Schedule | undefined {
  if (isAction(action)) {
    const schedule = parseSched(schedules, exceptions, cron, human)
    return schedule ? { later: later.schedule(schedule), action } : undefined
  } else return undefined
}
