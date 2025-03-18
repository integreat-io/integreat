import test from 'node:test'
import assert from 'node:assert/strict'
import type { JobDef } from './types.js'

import Schedule from './Schedule.js'

// Tests

test('should create Schedule from schedule definition', () => {
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = new Schedule(def)

  assert.equal(ret.cron, def.cron)
  assert.equal(typeof ret.shouldRun, 'function')
})

test('should not set invalid props', () => {
  const def = {
    cron: 50,
    action: 'SYNC',
  } as unknown as JobDef

  const ret = new Schedule(def)

  assert.equal(ret.cron, undefined)
})

test('should return true when schedule is within the given time period', () => {
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

  assert.equal(ret, true)
})

test('should return false when schedule is not within the given time period', () => {
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

  assert.equal(ret, false)
})

test('should support time zone', () => {
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

  assert.equal(ret, true)
})

test('should return false when no cron string is given', () => {
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

  assert.equal(ret, false)
})

test('should throw when dates are missing', () => {
  const start = undefined as unknown as Date // Trick TS
  const end = undefined as unknown as Date // Trick TS
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }
  const expectedError = { name: 'Error' }

  const schedule = new Schedule(def)
  assert.throws(() => schedule.shouldRun(start, end), expectedError)
})

test('should throw when dates are invalid', () => {
  const start = new Date('2023-07-11T12:51:00+02:00') // Valid
  const end = new Date('2023-07-11T25:56:00+02:00') // Invalid
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }
  const expectedError = { name: 'Error' }

  const schedule = new Schedule(def)
  assert.throws(() => schedule.shouldRun(start, end), expectedError)
})
