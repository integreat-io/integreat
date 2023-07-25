import test from 'ava'
import sinon from 'sinon'
import Schedule from './utils/Schedule.js'
import type { Action } from './types.js'

import dispatchScheduled from './dispatchScheduled.js'

// Setup

const action1 = {
  type: 'SYNC',
  payload: { type: 'entry', from: 'entryDb', to: 'dwh' },
}
const action2 = {
  type: 'SET',
  payload: { type: 'user', purge: true },
}
const action3 = {
  type: 'EXPIRE',
  payload: {},
}

const meta = { ident: { id: 'scheduler' }, queue: true }

// Tests

test('should dispatch actions scheduled within a time period', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const schedules = [
    new Schedule({ cron: '0,10,15,20,25 * * * *', action: action1 }), // Will only trigger once
    new Schedule({ cron: '45 * * * *', action: action2 }),
    new Schedule({ cron: '25 * * * *', action: action3 }),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected = [
    { ...action1, response: { status: 'queued' }, meta },
    { ...action3, response: { status: 'queued' }, meta },
  ]

  const ret = await dispatchScheduled(dispatch, schedules)(fromDate, toDate)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], { ...action1, meta })
  t.deepEqual(dispatch.args[1][0], { ...action3, meta })
  t.deepEqual(ret, expected)
})

test('should do nothing when none is scheduled within period', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const schedules = [
    new Schedule({ cron: '55 * * * *', action: action1 }),
    new Schedule({ cron: '45 * * * *', action: action2 }),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, schedules)(fromDate, toDate)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should do nothing when no schedules', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const schedules: Schedule[] = []
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, schedules)(fromDate, toDate)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should skip schedule without cron string or action', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const schedules = [
    new Schedule({ action: action1 }),
    new Schedule({ cron: '15 * * * *' }),
    new Schedule({ cron: '12 * * * *', action: action2 }),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected = [{ ...action2, response: { status: 'queued' }, meta }]

  const ret = await dispatchScheduled(dispatch, schedules)(fromDate, toDate)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], { ...action2, meta })
  t.deepEqual(ret, expected)
})

test('should return array of error responses', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'queued' })
    .onSecondCall()
    .resolves({ status: 'error', error: 'Could not queue' })
  const schedules = [
    new Schedule({ cron: '0,10,15,20,25 * * * *', action: action1 }),
    new Schedule({ cron: '45 * * * *', action: action2 }),
    new Schedule({ cron: '25 * * * *', action: action3 }),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T14:03Z')
  const expected = [
    { ...action1, response: { status: 'queued' }, meta },
    {
      ...action2,
      response: { status: 'error', error: 'Could not queue' },
      meta,
    },
    { ...action3, response: { status: 'queued' }, meta },
  ]

  const ret = await dispatchScheduled(dispatch, schedules)(fromDate, toDate)

  t.is(dispatch.callCount, 3)
  t.deepEqual(ret, expected)
})
