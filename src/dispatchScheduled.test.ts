import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import mapTransform from 'map-transform'
import Job from './jobs/Job.js'
import { IdentType, Action } from './types.js'

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

const meta = {
  ident: { id: 'scheduler', type: IdentType.Scheduler },
  queue: true,
}
const mapOptions = {}

// Tests

test('should dispatch actions scheduled within a time period', async () => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const jobs = [
    new Job(
      { id: 'action1', cron: '0,10,15,20,25 * * * *', action: action1 },
      mapTransform,
      mapOptions,
    ), // Will only trigger once
    new Job(
      { id: 'action2', cron: '45 * * * *', action: action2 },
      mapTransform,
      mapOptions,
    ),
    new Job(
      { id: 'action3', cron: '25 * * * *', action: action3 },
      mapTransform,
      mapOptions,
    ),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expectedAction1 = { type: 'RUN', payload: { jobId: 'action1' }, meta }
  const expectedAction3 = { type: 'RUN', payload: { jobId: 'action3' }, meta }
  const expected = [
    { ...expectedAction1, response: { status: 'queued' } },
    { ...expectedAction3, response: { status: 'queued' } },
  ]

  const ret = await dispatchScheduled(dispatch, jobs)(fromDate, toDate)

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction1)
  assert.deepEqual(dispatch.args[1][0], expectedAction3)
  assert.deepEqual(ret, expected)
})

test('should do nothing when none is scheduled within period', async () => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const jobs = [
    new Job({ cron: '55 * * * *', action: action1 }, mapTransform, mapOptions),
    new Job({ cron: '45 * * * *', action: action2 }, mapTransform, mapOptions),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, jobs)(fromDate, toDate)

  assert.equal(dispatch.callCount, 0)
  assert.deepEqual(ret, expected)
})

test('should do nothing when no schedules', async () => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const jobs: Job[] = []
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expected: Action[] = []

  const ret = await dispatchScheduled(dispatch, jobs)(fromDate, toDate)

  assert.equal(dispatch.callCount, 0)
  assert.deepEqual(ret, expected)
})

test('should skip schedule without cron string or action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'queued' })
  const jobs = [
    new Job({ id: 'action1', action: action1 }, mapTransform, mapOptions),
    new Job({ id: 'action0', cron: '15 * * * *' }, mapTransform, mapOptions),
    new Job(
      { id: 'action2', cron: '12 * * * *', action: action2 },
      mapTransform,
      mapOptions,
    ),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T11:26Z')
  const expectedActon2 = { type: 'RUN', payload: { jobId: 'action2' }, meta }
  const expected = [{ ...expectedActon2, response: { status: 'queued' } }]

  const ret = await dispatchScheduled(dispatch, jobs)(fromDate, toDate)

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedActon2)
  assert.deepEqual(ret, expected)
})

test('should return array of error responses', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'queued' })
    .onSecondCall()
    .resolves({ status: 'error', error: 'Could not queue' })
  const jobs = [
    new Job(
      { id: 'action1', cron: '0,10,15,20,25 * * * *', action: action1 },
      mapTransform,
      mapOptions,
    ),
    new Job(
      { id: 'action2', cron: '45 * * * *', action: action2 },
      mapTransform,
      mapOptions,
    ),
    new Job(
      { id: 'action3', cron: '25 * * * *', action: action3 },
      mapTransform,
      mapOptions,
    ),
  ]
  const fromDate = new Date('2021-05-11T11:03Z')
  const toDate = new Date('2021-05-11T14:03Z')
  const expectedActon1 = { type: 'RUN', payload: { jobId: 'action1' }, meta }
  const expectedActon2 = { type: 'RUN', payload: { jobId: 'action2' }, meta }
  const expectedActon3 = { type: 'RUN', payload: { jobId: 'action3' }, meta }
  const expected = [
    { ...expectedActon1, response: { status: 'queued' } },
    {
      ...expectedActon2,
      response: { status: 'error', error: 'Could not queue' },
    },
    { ...expectedActon3, response: { status: 'queued' } },
  ]

  const ret = await dispatchScheduled(dispatch, jobs)(fromDate, toDate)

  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(ret, expected)
})
