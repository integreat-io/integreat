import test from 'ava'
import sinon from 'sinon'
import later from 'later'
import mockQueue from '../tests/helpers/mockQueue'

import setupQueue from './queue'

// Helpers

let clock

test.before(() => {
  clock = sinon.useFakeTimers(Date.now())
})

test.after.always(() => {
  clock.restore()
})

// Tests

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
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const dispatch = sinon.stub().resolves({status: 'ok'})
  const action = {type: 'GET', payload: {type: 'entry'}, meta: {queue: true}}
  const expected = {type: 'GET', payload: {type: 'entry'}, meta: {queuedAt: Date.now()}}

  await queue.fromDispatch(dispatch)(action)

  t.is(dispatch.callCount, 0)
  t.is(push.callCount, 1)
  t.deepEqual(push.args[0][0], expected)
  t.is(push.args[0][1], null)
  t.is(push.args[0][2], null)
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

test('fromDispatch should return error response when underlying queue throws', async (t) => {
  const queue = setupQueue(mockQueue())
  sinon.stub(queue.queue, 'push').rejects(new Error('The horror'))
  const action = {type: 'GET', payload: {type: 'entry'}, meta: {queue: true}}
  const expected = {status: 'error', error: 'Could not push to queue. Error: The horror'}

  const response = await queue.fromDispatch(() => {})(action)

  t.deepEqual(response, expected)
})

test('fromDispatch should reschedule repeating action', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const schedule = {schedules: [{h: [2]}]}
  const action = {
    type: 'GET',
    payload: {type: 'entry'},
    meta: {
      queue: false,
      schedule
    }
  }
  const nextTime = later.schedule(schedule).next().getTime()

  await queue.fromDispatch(() => {})(action)

  t.is(push.callCount, 1)
  const nextAction = push.args[0][0]
  t.is(nextAction.type, 'GET')
  t.is(push.args[0][1], nextTime)
})

test('fromDispatch should not reschedule when schedule is ended', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const schedule = {schedules: [{Y_b: [2015]}]}
  const action = {
    type: 'GET',
    payload: {type: 'entry'},
    meta: {
      queue: false,
      schedule
    }
  }

  await queue.fromDispatch(() => {})(action)

  t.is(push.callCount, 0)
})

test('fromDispatch should not reschedule with invalid schedule definition', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const action = {
    type: 'GET',
    payload: {type: 'entry'},
    meta: {
      queue: false,
      schedule: 'at 42 am'
    }
  }

  await queue.fromDispatch(() => {})(action)

  t.is(push.callCount, 0)
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

// Tests -- schedule

test('schedule should exist', (t) => {
  const queue = setupQueue(mockQueue())

  t.is(typeof queue.schedule, 'function')
})

test('schedule should enqueue scheduled action', async (t) => {
  const queue = setupQueue(mockQueue())
  const push = sinon.spy(queue.queue, 'push')
  const defs = [
    {schedule: 'at 2:00 am', action: {type: 'SYNC'}},
    {schedule: {h: [3]}, action: {type: 'EXPIRE'}}
  ]
  const expected = {
    type: 'SYNC',
    meta: {
      id: null,
      schedule: {
        exceptions: [],
        schedules: [{t: [7200]}]
      },
      queuedAt: Date.now()
    }
  }

  await queue.schedule(defs)

  t.is(push.callCount, 2)
  t.deepEqual(push.args[0][0], expected)
  t.true(Number.isInteger(push.args[0][1]))
  t.truthy(push.args[1][0])
})

test('should return response objects with status queued', async (t) => {
  const queue = setupQueue(mockQueue())
  const defs = [
    {id: 'sched1', schedule: 'at 2:00 am', action: {type: 'SYNC'}},
    {id: 'sched2', schedule: {h: [3]}, action: {type: 'EXPIRE'}}
  ]
  const expected = [
    {status: 'queued', data: {id: 'sched1'}},
    {status: 'queued', data: {id: 'sched2'}}
  ]

  const ret = await queue.schedule(defs)

  t.deepEqual(ret, expected)
})

test('should return response objects with status error when invalid schedule', async (t) => {
  const queue = setupQueue(mockQueue())
  const defs = [
    {id: 'sched1', schedule: 'at 42 am', action: {type: 'SYNC'}}
  ]

  const ret = await queue.schedule(defs)

  t.is(ret.length, 1)
  t.is(ret[0].status, 'error')
})

test('should accept single schedule definition object', async (t) => {
  const queue = setupQueue(mockQueue())
  const defs = {id: 'sched1', schedule: 'at 2:00 am', action: {type: 'SYNC'}}
  const expected = [
    {status: 'queued', data: {id: 'sched1'}}
  ]

  const ret = await queue.schedule(defs)

  t.deepEqual(ret, expected)
})
