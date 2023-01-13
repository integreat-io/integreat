/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'

import createSchedule from './createSchedule.js'

// Tests

test('should create schedule from schedules definition', (t) => {
  const def = {
    schedules: [{ m: [50] }],
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = createSchedule(def)!

  t.is(typeof ret.later.next, 'function')
  const nextDate = ret.later.next(1) as Date
  t.is(nextDate.getMinutes(), 50)
  t.deepEqual(ret.action, def.action)
})

test('should create schedule from schedules and exceptions definition', (t) => {
  const nowDate = new Date('2021-05-11T10:45:30Z')
  const def = {
    schedules: [{ m: [50] }],
    exceptions: [{ h: [10] }],
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = createSchedule(def)!

  t.is(typeof ret.later.next, 'function')
  const nextDate = ret.later.next(1, nowDate) as Date
  t.is(nextDate.getMinutes(), 50)
  t.is(nextDate.getUTCHours(), 11) // Make sure the exception skips it to next hour
  t.deepEqual(ret.action, def.action)
})

test('should create schedule from cron definition', (t) => {
  const def = {
    cron: '50 * * * *',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = createSchedule(def)!

  t.is(typeof ret.later.next, 'function')
  const nextDate = ret.later.next(1) as Date
  t.is(nextDate.getMinutes(), 50)
  t.deepEqual(ret.action, def.action)
})

test('should create schedule from human readable definition', (t) => {
  const def = {
    human: 'every hour',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = createSchedule(def)!

  t.is(typeof ret.later.next, 'function')
  const nextDate = ret.later.next(1) as Date
  t.is(nextDate.getMinutes(), 0)
  t.deepEqual(ret.action, def.action)
})

test('should return undefined when no matching schedule', (t) => {
  const def = {
    myownschedule: 'now!',
    action: {
      type: 'SYNC',
      payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
    },
  }

  const ret = createSchedule(def)

  t.is(ret, undefined)
})

test('should return undefined when job has a flow', (t) => {
  const def = {
    schedules: [{ m: [50] }],
    flow: [
      {
        id: 'step1',
        action: {
          type: 'SYNC',
          payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
        },
      },
    ],
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret = createSchedule(def as any)

  t.is(ret, undefined)
})
