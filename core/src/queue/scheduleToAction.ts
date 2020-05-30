import later = require('later')
import nextSchedule from './nextSchedule'
import { Action } from '../types'
import { ScheduleDef, ScheduleObject } from './types'

const cleanSchedule = ({ schedules, exceptions }: ScheduleObject) => ({
  schedules,
  exceptions,
})
const wrapSimpleSchedule = (schedule: object | object[]) => ({
  schedules: ([] as object[]).concat(schedule),
})

function parseStringDef(def: string) {
  const schedule = later.parse.text(def)
  if (schedule.error !== -1) {
    throw new Error('Invalid schedule string')
  }
  return cleanSchedule(schedule)
}

const isScheduleObject = (
  def: object | object[] | ScheduleObject
): def is ScheduleObject =>
  (def as ScheduleObject).schedules !== undefined ||
  (def as ScheduleObject).exceptions !== undefined

function parseSchedule(
  def: string | object | object[] | ScheduleObject | null
): ScheduleObject | null {
  if (typeof def === 'string') {
    return parseStringDef(def)
  } else if (def) {
    return isScheduleObject(def) ? cleanSchedule(def) : wrapSimpleSchedule(def)
  }

  return null
}

/**
 * Create a queuable action from a schedule definition.
 */
export default function scheduleToAction(
  def?: ScheduleDef | null
): Action | null {
  if (!def) {
    return null
  }

  const schedule = parseSchedule(def.schedule)
  const nextTime = nextSchedule(schedule, true)

  return {
    ...def.action,
    meta: {
      ...(def.id && { id: def.id }),
      schedule,
      queue: nextTime ? nextTime.getTime() : true,
    },
  }
}
