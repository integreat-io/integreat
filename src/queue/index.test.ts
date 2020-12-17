import test from 'ava'
import sinon = require('sinon')
import later = require('later')
import mockQueue from '../tests/helpers/mockQueue'

import createQueue from '.'

// Helpers

const middleware = async () => ({ status: 'ok', data: [] })

let clock: sinon.SinonFakeTimers

test.before(() => {
  clock = sinon.useFakeTimers(Date.now())
})

test.after.always(() => {
  clock.restore()
})

// Tests

test('should make underlying queue accessible', (t) => {
  const redisQueue = mockQueue()

  const queue = createQueue(redisQueue)

  t.is(queue.queue, redisQueue)
})

// Tests -- middleware

test('middleware should return response with status queued and queued id', async (t) => {
  const queue = createQueue(mockQueue())
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true },
  }
  const expected = { status: 'queued', data: { id: 'queued1' } }

  const response = await queue.middleware(dispatch)(action)

  t.deepEqual(response, expected)
})

test('middleware should queue queuable action', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queuedAt: Date.now() },
  }

  await queue.middleware(dispatch)(action)

  t.is(dispatch.callCount, 0)
  t.is(push.callCount, 1)
  t.deepEqual(push.args[0][0], expected)
  t.is(push.args[0][1], undefined)
  t.is(push.args[0][2], undefined)
})

test('middleware should dispatch unqueuable actions and return response', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }
  const expected = { status: 'ok' }

  const response = await queue.middleware(dispatch)(action)

  t.is(push.callCount, 0)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
  t.deepEqual(response, expected)
})

test('middleware should queue with timestamp', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: 1516113629153 },
  }

  await queue.middleware(middleware)(action)

  t.is(push.callCount, 1)
  t.is(push.args[0][1], 1516113629153)
})

test('middleware should queue with id', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true, id: 'action1' },
  }

  await queue.middleware(middleware)(action)

  t.is(push.callCount, 1)
  t.is(push.args[0][2], 'action1')
})

test('middleware should return error response when underlying queue throws', async (t) => {
  const queue = createQueue(mockQueue())
  sinon.stub(queue.queue, 'push').rejects(new Error('The horror'))
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true },
  }
  const expected = {
    status: 'error',
    error: 'Could not push to queue. Error: The horror',
  }

  const response = await queue.middleware(middleware)(action)

  t.deepEqual(response, expected)
})

test('middleware should reschedule repeating action', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const schedule = { schedules: [{ h: [2] }] }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      queue: false,
      schedule,
    },
  }
  const nextTime = (later.schedule(schedule).next(1) as Date).getTime()

  await queue.middleware(middleware)(action)

  t.is(push.callCount, 1)
  const nextAction = push.args[0][0]
  t.is(nextAction.type, 'GET')
  t.is(push.args[0][1], nextTime)
})

test('middleware should not reschedule when schedule is ended', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const schedule = { schedules: [{ ['Y_b']: [2015] }] }
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      queue: false,
      schedule,
    },
  }

  await queue.middleware(middleware)(action)

  t.is(push.callCount, 0)
})

test('middleware should not reschedule with invalid schedule definition', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      queue: false,
      schedule: 'at 42 am',
    },
  }

  await queue.middleware(middleware)(action)

  t.is(push.callCount, 0)
})

// Tests -- setDispatch and dequeueing

test('should subscribe underlying queue and dispatch', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }

  const queue = createQueue(mockQueue())
  queue.setDispatch(dispatch)
  await queue.queue.push(action) // Pushes directly to subscribed handler

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should not subscribe unless setDispatch is called', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  await queue.queue.push(action) // Pushes directly to subscribed handler

  t.is(mockSubscribe.callCount, 0)
})

test('should not subscribe twice', async (t) => {
  const dispatch = async () => ({ status: 'ok' })
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  queue.setDispatch(dispatch)
  queue.setDispatch(dispatch)

  t.is(mockSubscribe.callCount, 1)
})

test('should not subscribe when called with no-function', async (t) => {
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  queue.setDispatch(null)

  t.is(mockSubscribe.callCount, 0)
})

test('should not throw when no dispatch function', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }

  const queue = createQueue(mockQueue())
  await t.notThrowsAsync(queue.queue.push(action))
})

// Tests -- schedule

test('schedule should exist', (t) => {
  const queue = createQueue(mockQueue())

  t.is(typeof queue.schedule, 'function')
})

test('schedule should enqueue scheduled action', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const defs = [
    { schedule: 'at 2:00 am', action: { type: 'SYNC', payload: {} } },
    { schedule: { h: [3] }, action: { type: 'EXPIRE', payload: {} } },
  ]
  const expected = {
    type: 'SYNC',
    payload: {},
    meta: {
      schedule: {
        exceptions: [],
        schedules: [{ t: [7200] }],
      },
      queuedAt: Date.now(),
    },
  }

  await queue.schedule(defs)

  t.is(push.callCount, 2)
  t.deepEqual(push.args[0][0], expected)
  t.true(Number.isInteger(push.args[0][1] as number))
  t.truthy(push.args[1][0])
})

test('should return response objects with status queued', async (t) => {
  const queue = createQueue(mockQueue())
  const defs = [
    {
      id: 'sched1',
      schedule: 'at 2:00 am',
      action: { type: 'SYNC', payload: {} },
    },
    {
      id: 'sched2',
      schedule: { h: [3] },
      action: { type: 'EXPIRE', payload: {} },
    },
  ]
  const expected = [
    { status: 'queued', data: { id: 'sched1' } },
    { status: 'queued', data: { id: 'sched2' } },
  ]

  const ret = await queue.schedule(defs)

  t.deepEqual(ret, expected)
})

test('should return response objects with status error when invalid schedule', async (t) => {
  const queue = createQueue(mockQueue())
  const defs = [
    {
      id: 'sched1',
      schedule: 'at 42 am',
      action: { type: 'SYNC', payload: {} },
    },
  ]

  const ret = await queue.schedule(defs)

  t.is(ret.length, 1)
  t.is(ret[0].status, 'error')
})

test('should accept single schedule definition object', async (t) => {
  const queue = createQueue(mockQueue())
  const defs = {
    id: 'sched1',
    schedule: 'at 2:00 am',
    action: { type: 'SYNC', payload: {} },
  }
  const expected = [{ status: 'queued', data: { id: 'sched1' } }]

  const ret = await queue.schedule(defs)

  t.deepEqual(ret, expected)
})
