import test from 'ava'
import type { JobDef } from './types.js'

import Schedule from './Schedule.js'

// Tests

test('should create Schedule from schedule definition', (t) => {
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = new Schedule(def)

  t.is(ret.cron, def.cron)
  t.is(typeof ret.shouldRun, 'function')
})

test('should not set invalid props', (t) => {
  const def = {
    cron: 50,
    action: 'SYNC',
  } as unknown as JobDef

  const ret = new Schedule(def)

  t.is(ret.cron, undefined)
})

test('should return true when schedule is within the given time period', (t) => {
  const start = new Date('2023-07-11T12:47:00+02:00')
  const end = new Date('2023-07-11T12:51:00+02:00')
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const ret = schedule.shouldRun(start, end)

  t.true(ret)
})

test('should return false when schedule is not within the given time period', (t) => {
  const start = new Date('2023-07-11T12:51:00+02:00')
  const end = new Date('2023-07-11T12:56:00+02:00')
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const ret = schedule.shouldRun(start, end)

  t.false(ret)
})

test('should support time zone', (t) => {
  const tz = 'America/Nassau'
  const start = new Date('2023-07-11T12:47:00+02:00') // 6:47 AM in Nassau
  const end = new Date('2023-07-11T12:51:00+02:00')
  const def = {
    cron: '50 6 * * *',
    tz,
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const ret = schedule.shouldRun(start, end)

  t.true(ret)
})

test('should return false when no cron string is given', (t) => {
  const start = new Date('2023-07-11T12:51:00+02:00')
  const end = new Date('2023-07-11T12:56:00+02:00')
  const def = {
    cron: undefined,
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const ret = schedule.shouldRun(start, end)

  t.false(ret)
})

test('should throw when dates are missing', (t) => {
  const start = undefined as unknown as Date // Trick TS
  const end = undefined as unknown as Date // Trick TS
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const err = t.throws(() => schedule.shouldRun(start, end))

  t.true(err instanceof Error)
})

test('should throw when dates are invalid', (t) => {
  const start = new Date('2023-07-11T12:51:00+02:00') // Valid
  const end = new Date('2023-07-11T25:56:00+02:00') // Invalid
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const schedule = new Schedule(def)
  const err = t.throws(() => schedule.shouldRun(start, end))

  t.true(err instanceof Error)
})
