import test from 'ava'
import sinon from 'sinon'
import Rx from 'rx'

import Scheduler from './scheduler'

// Helpers

const onNext = Rx.ReactiveTest.onNext
// const onCompleted = Rx.ReactiveTest.onCompleted

// Tests

test('should exist', (t) => {
  t.is(typeof Scheduler, 'function')
})

// Tests -- subscribe

test('subscribe should exist', (t) => {
  const sch = new Scheduler()

  t.is(typeof sch.subscribe, 'function')
})

test('subscribe should return disposable', (t) => {
  const sch = new Scheduler()
  const handler = () => {}

  const ret = sch.subscribe(handler)

  t.is(typeof ret.dispose, 'function')
})

// Tests -- unsubscribe

test('unsubscribe should exist', (t) => {
  const sch = new Scheduler()

  t.is(typeof sch.unsubscribe, 'function')
})

test('should unsubscribe', (t) => {
  const sch = new Scheduler()
  const subscription = {dispose: sinon.spy()}

  sch.unsubscribe(subscription)

  t.true(subscription.dispose.calledOnce)
})

test('should handle unsubscribe with no disposable', (t) => {
  const sch = new Scheduler()

  t.notThrows(() => {
    sch.unsubscribe()
  })
})

// Tests -- schedule

test('schedule should exist', (t) => {
  const sch = new Scheduler()

  t.is(typeof sch.schedule, 'function')
})

test('should call handler on given time interval', (t) => {
  const ts = new Rx.TestScheduler()
  const sch = new Scheduler(ts)
  // Subscribe through replay subject to catch events before subscription
  const replay = new Rx.ReplaySubject()
  sch.subscribe(replay)
  const expected = [onNext(200, {})]

  const ret = ts.startScheduler(() => {
    sch.schedule(100, {})
    return replay
  }, {created: 100, subscribed: 100})

  t.deepEqual(ret.messages, expected)
})

test('should call handler with payload', (t) => {
  const ts = new Rx.TestScheduler()
  const sch = new Scheduler(ts)
  const payload = {}
  const handler = sinon.spy()
  sch.subscribe(handler)

  ts.startScheduler(() => {
    sch.schedule(100, payload)
    return sch._queue
  })

  t.true(handler.calledOnce)
  t.true(handler.calledWith(payload))
})

test('should not schedule without valid time', (t) => {
  const ts = new Rx.TestScheduler()
  const sch = new Scheduler(ts)
  const handler = sinon.spy()
  sch.subscribe(handler)

  ts.startScheduler(() => {
    sch.schedule(null, {})
    return sch._queue
  })

  t.false(handler.called)
})

test('should allow time set as Date', (t) => {
  const ts = new Rx.TestScheduler()
  const sch = new Scheduler(ts)
  const handler = sinon.spy()
  sch.subscribe(handler)

  ts.startScheduler(() => {
    sch.schedule(new Date(Date.now() + 500), {})
    return sch._queue
  })

  t.true(handler.calledOnce)
})

test.todo('should call error handler')
