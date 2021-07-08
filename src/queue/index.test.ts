import test from 'ava'
import sinon = require('sinon')
import mockQueue from '../tests/helpers/mockQueue'
import { Action } from '../types'

import createQueue from '.'

// Helpers

const next = async (action: Action) => ({
  ...action,
  response: { ...action.response, status: 'ok', data: [] },
})

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
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true },
  }
  const dispatch = sinon.stub().resolves({ ...action, status: 'ok' })
  const expected = {
    ...action,
    response: { status: 'queued' },
    meta: { ...action.meta, id: 'queued1' },
  }

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
  const action = { type: 'GET', payload: { type: 'entry' } }
  const expected = { ...action, response: { status: 'ok' } }
  const dispatch = sinon
    .stub()
    .resolves({ ...action, response: { status: 'ok' } })

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

  await queue.middleware(next)(action)

  t.is(push.callCount, 1)
  t.is(push.args[0][1], 1516113629153)
})

test('middleware should queue with id', async (t) => {
  const queue = createQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { id: 'action1', queue: true },
  }

  await queue.middleware(next)(action)

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
    ...action,
    response: {
      status: 'error',
      error: 'Could not push to queue. Error: The horror',
    },
  }

  const response = await queue.middleware(next)(action)

  t.deepEqual(response, expected)
})

// Tests -- setDispatch and dequeueing

test('should subscribe to queue', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }

  const queue = createQueue(mockQueue())
  await queue.setDispatch(dispatch)
  await queue.queue.push(action) // Pushes directly to underlying queue

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should not subscribe unless setDispatch is called', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  await queue.queue.push(action) // Pushes directly to underlying queue

  t.is(mockSubscribe.callCount, 0)
})

test('should override previous subscription', async (t) => {
  const dispatch1 = async () => ({ status: 'ok' })
  const dispatch2 = async () => ({ status: 'ok' })
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  await queue.setDispatch(dispatch1)
  await queue.setDispatch(dispatch2)

  t.is(mockSubscribe.callCount, 2)
  t.is(mockSubscribe.args[0][0], dispatch1)
  t.is(mockSubscribe.args[1][0], dispatch2)
})

test('should unsubscribe when setDispatch is called with null', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const action = { type: 'GET', payload: { type: 'entry' } }
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')
  const mockUnubscribe = sinon.spy(mock, 'unsubscribe')

  const queue = createQueue(mock)
  await queue.setDispatch(dispatch)
  await queue.setDispatch(null)
  await queue.queue.push(action) // Pushes directly to underlying queue

  t.is(mockSubscribe.callCount, 1)
  t.is(mockUnubscribe.callCount, 1)
  t.is(dispatch.callCount, 0)
})

test('should not subscribe when called with no-function', async (t) => {
  const mock = mockQueue()
  const mockSubscribe = sinon.spy(mock, 'subscribe')

  const queue = createQueue(mock)
  await queue.setDispatch(null)

  t.is(mockSubscribe.callCount, 0)
})

test('should not throw when no dispatch function', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }

  const queue = createQueue(mockQueue())
  await t.notThrowsAsync(queue.queue.push(action))
})
