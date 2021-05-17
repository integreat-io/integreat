import test from 'ava'
import sinon = require('sinon')
import createSchedule from './utils/createSchedule'
import { Action } from './types'

import dispatchScheduled, { Scheduled } from './dispatchScheduled'

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
  const scheduled = [
    { schedules: [{ m: [0, 10, 15, 20, 25] }], action: action1 }, // Will only trigger once
    { schedules: [{ m: [45] }], action: action2 },
    { schedules: [{ m: [25] }], action: action3 },
  ].map(createSchedule)
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected = [
    { ...action1, response: { status: 'queued' }, meta },
    { ...action3, response: { status: 'queued' }, meta },
  ]

  const ret = await dispatchScheduled(dispatch, scheduled)(fromDate, toDate)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], { ...action1, meta })
  t.deepEqual(dispatch.args[1][0], { ...action3, meta })
  t.deepEqual(ret, expected)
})

test('should do nothing when none is scheduled within period', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const scheduled = [
    { schedules: [{ m: [55] }], action: action1 },
    { schedules: [{ m: [45] }], action: action2 },
  ].map(createSchedule)
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, scheduled)(fromDate, toDate)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should do nothing when no schedules', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const scheduled: Scheduled[] = []
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, scheduled)(fromDate, toDate)

  t.is(dispatch.callCount, 0)
  t.deepEqual(ret, expected)
})

test('should skip undefined in scheduled', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const scheduled = [
    { ownschedul: 'now!', action: action1 },
    { schedules: [{ m: [12] }], action: action2 },
  ].map(createSchedule)
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected = [{ ...action2, response: { status: 'queued' }, meta }]

  const ret = await dispatchScheduled(dispatch, scheduled)(fromDate, toDate)

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
  const scheduled = [
    { schedules: [{ m: [0, 10, 15, 20, 25] }], action: action1 },
    { schedules: [{ m: [45] }], action: action2 },
    { schedules: [{ m: [25] }], action: action3 },
  ].map(createSchedule)
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

  const ret = await dispatchScheduled(dispatch, scheduled)(fromDate, toDate)

  t.is(dispatch.callCount, 3)
  t.deepEqual(ret, expected)
})
