import test from 'ava'

import Source from './index'

// Tests

test('should exist', (t) => {
  t.is(typeof Source, 'function')
})

test('should create source', (t) => {
  const id = 'entry1'
  const adapter = {}

  const source = new Source(id, adapter)

  t.is(source.id, 'entry1')
  t.is(source.adapter, adapter)
})

test('should have no adapter by default', (t) => {
  const source = new Source()

  t.is(source.adapter, null)
})

test('should have default fetch', (t) => {
  const source = new Source()

  t.is(source.fetch.endpoint, null)
  t.is(source.fetch.changelog, null)
  t.is(source.fetch.auth, null)
})

test('should have default send', (t) => {
  const defaultSend = {
    endpoint: null,
    auth: null,
    map: []
  }

  const source = new Source()

  t.deepEqual(source.send, defaultSend)
})

test('should have no item by default', (t) => {
  const source = new Source()

  t.is(source.item, null)
})

test('should have default sync settings', (t) => {
  const source = new Source()

  t.is(source.schedule, null)
  t.false(source.allowRelay)
  t.false(source.allowPush)
  t.is(source.nextSync, null)
})

// Tests -- setNextSync

test('setNextSync should exist', (t) => {
  const source = new Source()

  t.is(typeof source.setNextSync, 'function')
})

test('setNextSync should set now when never synced', (t) => {
  const source = new Source('entry')
  source.schedule = 3600
  const before = Date.now()

  const time = source.setNextSync()

  const after = Date.now()
  t.true(time >= before)
  t.true(time <= after)
  t.is(source.nextSync, time)
})

test('should return one hour after last sync time', (t) => {
  const source = new Source('entry')
  source.schedule = 3600
  source.nextSync = Date.now()
  const expected = source.nextSync + (3600000)

  const time = source.setNextSync()

  t.is(time, expected)
  t.is(source.nextSync, expected)
})

test('should return now when more than one period since last sync', (t) => {
  const source = new Source('entry')
  source.schedule = 3600
  source.nextSync = Date.now() - 7200000
  const before = Date.now()

  const time = source.setNextSync()

  const after = Date.now()
  t.true(time >= before)
  t.true(time <= after)
  t.is(source.nextSync, time)
})

test('should return null when no sync schedule', (t) => {
  const source = new Source('entry')
  source.nextSync = Date.now() - 7200000

  const time = source.setNextSync()

  t.is(time, null)
  t.is(source.nextSync, null)
})

test('should set given sync time', (t) => {
  const source = new Source('entry')
  const nextSync = new Date('2011-12-11').getTime()

  const time = source.setNextSync(nextSync)

  t.is(time, nextSync)
  t.is(source.nextSync, nextSync)
})
