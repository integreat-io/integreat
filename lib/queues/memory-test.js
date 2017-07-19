import test from 'ava'
import Rx from 'rx'
import sinon from 'sinon'

import memory from './memory'

// Helpers

const onNext = Rx.ReactiveTest.onNext

// Tests

test('should exist', (t) => {
  t.is(typeof memory, 'function')
})

// Tests -- subscribe

test('subscribe should exist', (t) => {
  const queue = memory()

  t.truthy(queue)
  t.is(typeof queue.subscribe, 'function')
})

test('subscribe should return disposable', (t) => {
  const queue = memory()
  const handler = () => {}

  const ret = queue.subscribe(handler)

  t.is(typeof ret.dispose, 'function')
})

// Tests -- unsubscribe

test('unsubscribe should exist', (t) => {
  const queue = memory()

  t.truthy(queue)
  t.is(typeof queue.unsubscribe, 'function')
})

test('unsubscribe should unsubscribe', (t) => {
  const queue = memory()
  const subscription = {dispose: sinon.spy()}

  queue.unsubscribe(subscription)

  t.true(subscription.dispose.calledOnce)
})

test('unsubscribe should not throw when no disposable', (t) => {
  const queue = memory()

  t.notThrows(() => {
    queue.unsubscribe()
  })
})

// Tests -- push

test('push should exist', (t) => {
  const queue = memory()

  t.truthy(queue)
  t.is(typeof queue.push, 'function')
})

test('push should queue action and dispatch it', (t) => {
  const ts = new Rx.TestScheduler()
  const replay = new Rx.ReplaySubject()
  const dispatch = sinon.stub().returns({status: 'ok'})
  const action = {type: 'SET', payload: {}}
  const queue = memory({altScheduler: ts})
  queue.subscribe(dispatch)

  ts.startScheduler(() => {
    queue.push(action, 0)
    return replay
  })

  t.true(dispatch.calledOnce)
  t.true(dispatch.calledWith(action))
})

test('push should schedule action and dispatch it on time', (t) => {
  const ts = new Rx.TestScheduler()
  const replay = new Rx.ReplaySubject()
  const dispatch = sinon.stub().returns({status: 'ok'})
  const action = {type: 'SET', payload: {}}
  const expected = [onNext(200, action)]
  const queue = memory({altScheduler: ts})
  queue.subscribe(replay)
  queue.subscribe(dispatch)

  const ret = ts.startScheduler(() => {
    queue.push(action, 200)
    return replay
  }, {created: 100, subscribed: 150})

  t.deepEqual(ret.messages, expected)
  t.true(dispatch.calledOnce)
  t.true(dispatch.calledWith(action))
})

test('push should allow time set as Date', (t) => {
  const ts = new Rx.TestScheduler()
  const replay = new Rx.ReplaySubject()
  const dispatch = sinon.stub().returns({status: 'ok'})
  const action = {type: 'SET', payload: {}}
  const queue = memory({altScheduler: ts})
  queue.subscribe(dispatch)

  ts.startScheduler(() => {
    queue.push(action, new Date(Date.now() + 500))
    return replay
  })

  t.true(dispatch.calledOnce)
})

test('push should queue with current timestamp as default', (t) => {
  const ts = new Rx.TestScheduler()
  const replay = new Rx.ReplaySubject()
  const dispatch = sinon.stub().returns({status: 'ok'})
  const action = {type: 'SET', payload: {}}
  const time = Date.now()
  const queue = memory({altScheduler: ts})
  queue.subscribe(replay)
  queue.subscribe(dispatch)

  const ret = ts.startScheduler(() => {
    queue.push(action)
    return replay
  }, {created: 0, subscribed: 0, disposed: time + 200})

  t.is(ret.messages.length, 1)
  t.true(ret.messages[0].time >= time)
  t.true(dispatch.calledOnce)
})

test('push should return true', async (t) => {
  const queue = memory()

  const ret = await queue.push({})

  t.true(ret)
})
