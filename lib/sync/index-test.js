import test from 'ava'
import sinon from 'sinon'

import IntegreatSync from '.'

test('should exist', (t) => {
  t.is(typeof IntegreatSync, 'function')
})

test('start should exist', (t) => {
  const sync = new IntegreatSync()

  t.is(typeof sync.start, 'function')
})

test('stop should exist', (t) => {
  const sync = new IntegreatSync()

  t.is(typeof sync.stop, 'function')
})

test('on should exist', (t) => {
  const sync = new IntegreatSync()

  t.is(typeof sync.on, 'function')
})

test('on should return instance for chaining', (t) => {
  const sync = new IntegreatSync()

  const ret = sync.on('start', () => {})

  t.is(ret, sync)
})

test('should emit start event on start', (t) => {
  const sync = new IntegreatSync()
  const listener = sinon.spy()
  sync.on('start', listener)

  return sync.start()

  .then(() => {
    t.true(listener.calledOnce)
  })
})

test('should emit stop event on stop', (t) => {
  const sync = new IntegreatSync()
  const listener = sinon.spy()
  sync.on('stop', listener)

  sync.stop()

  t.true(listener.calledOnce)
})
