import test from 'ava'
import sinon from 'sinon'
import mockQueue from '../tests/helpers/mockQueue'

import setupQueue from './queue'

test('should exist', (t) => {
  t.is(typeof setupQueue, 'function')
})

test('should make underlying queue accessible', (t) => {
  const redisQueue = mockQueue()

  const queue = setupQueue(redisQueue)

  t.is(queue.queue, redisQueue)
})

// Tests -- fromDispatch

test('fromDispatch should exist', (t) => {
  const queue = setupQueue(mockQueue())

  t.is(typeof queue.fromDispatch, 'function')
})

test('fromDispatch should return response with status queued and queued id', async (t) => {
  const queue = setupQueue(mockQueue())
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const action = {type: 'GET', payload: {type: 'entry'}, meta: {queue: true}}
  const expected = {status: 'queued', data: {id: 'queued1'}}

  const response = await queue.fromDispatch(dispatch)(action)

  t.deepEqual(response, expected)
})

test('fromDispatch should queue queuable action', async (t) => {
  const queuedAt = Date.now()
  const clock = sinon.useFakeTimers(queuedAt)
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const action = {type: 'GET', payload: {type: 'entry'}, meta: {queue: true}}
  const expected = {type: 'GET', payload: {type: 'entry'}, meta: {queuedAt}}

  await queue.fromDispatch(dispatch)(action)

  t.is(dispatch.callCount, 0)
  t.is(push.callCount, 1)
  t.deepEqual(push.args[0][0], expected)
  t.is(push.args[0][1], null)
  t.is(push.args[0][2], null)

  clock.restore()
})

test('fromDispatch should dispatch unqueuable actions and return response', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const action = {type: 'GET', payload: {type: 'entry'}}
  const expected = {status: 'ok'}

  const response = await queue.fromDispatch(dispatch)(action)

  t.is(push.callCount, 0)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
  t.deepEqual(response, expected)
})

test('fromDispatch should queue with timestamp', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: {type: 'entry'},
    meta: {queue: 1516113629153}
  }

  await queue.fromDispatch(() => {})(action)

  t.is(push.callCount, 1)
  t.is(push.args[0][1], 1516113629153)
})

test('fromDispatch should queue with id', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: {type: 'entry'},
    meta: {queue: true, id: 'action1'}
  }

  await queue.fromDispatch(() => {})(action)

  t.is(push.callCount, 1)
  t.is(push.args[0][2], 'action1')
})

test('should return error response when underlying queue throws', async (t) => {
  const queue = setupQueue(mockQueue())
  sinon.stub(queue.queue, 'push').rejects(new Error('The horror'))
  const action = {type: 'GET', payload: {type: 'entry'}, meta: {queue: true}}
  const expected = {status: 'error', error: 'Could not push to queue. Error: The horror'}

  const response = await queue.fromDispatch(() => {})(action)

  t.deepEqual(response, expected)
})

// Tests -- setDispatch and dequeueing

test('setDispatch should exist', (t) => {
  const queue = setupQueue(mockQueue())

  t.is(typeof queue.setDispatch, 'function')
})

test('should subscribe underlying queue and dispatch', async (t) => {
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const action = {type: 'GET', payload: {type: 'entry'}}

  const queue = setupQueue(mockQueue())
  queue.setDispatch(dispatch)
  await queue.queue.push(action) // Pushes directly to subscribed handler

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})

test('should not throw when no dispatch function', async (t) => {
  const action = {type: 'GET', payload: {type: 'entry'}}

  const queue = setupQueue(mockQueue())
  await t.notThrows(queue.queue.push(action))
})
