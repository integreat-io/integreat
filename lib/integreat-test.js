import test from 'ava'
import sinon from 'sinon'
const Source = require('./source')
const Attribute = require('./source/attribute')

import Integreat from './integreat'

const createSource = () => {
  const adapter = {
    retrieve: () => Promise.resolve([{id: 'item1'}]),
    normalize: (item, path) => item
  }
  const source = new Source('entry')
  source.adapter = adapter
  source.fetch = {endpoint: 'http://some.api/entries/'}
  source.attributes = [new Attribute('id', null, 'id')]
  source.schedule = 3600

  return source
}

// Tests

test('should exist', (t) => {
  t.is(typeof Integreat, 'function')
})

test('class should have version number', (t) => {
  t.is(typeof Integreat.version, 'string')
})

test('instance should have version number', (t) => {
  const great = new Integreat()

  t.is(great.version, Integreat.version)
})

// Tests -- events

test('on should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.on, 'function')
})

test('should accept listener and return this Integreat instance', (t) => {
  const great = new Integreat()

  const ret = great.on('start', () => {})

  t.is(ret, great)
})

// Tests -- adapters

test('getAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getAdapter, 'function')
})

test('setAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setAdapter, 'function')
})

test('should set and get adapter', (t) => {
  const great = new Integreat()
  const adapter = {}

  great.setAdapter('ad1', adapter)
  const ret = great.getAdapter('ad1')

  t.is(ret, adapter)
})

test('removeAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeAdapter, 'function')
})

test('should remove adapter', (t) => {
  const great = new Integreat()
  great.setAdapter('ad1', {})

  great.removeAdapter('ad1')

  const ret = great.getAdapter('ad1')
  t.is(ret, null)
})

// Tests -- filters

test('getFilter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getFilter, 'function')
})

test('setFilter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setFilter, 'function')
})

test('should set and get filter', (t) => {
  const great = new Integreat()
  const filter = {}

  great.setFilter('filt1', filter)
  const ret = great.getFilter('filt1')

  t.is(ret, filter)
})

test('removeFilter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeFilter, 'function')
})

test('should remove filter', (t) => {
  const great = new Integreat()
  great.setFilter('filt1', {})

  great.removeFilter('filt1')

  const ret = great.getFilter('filt1')
  t.is(ret, null)
})

// Tests -- mappers

test('getMapper should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getMapper, 'function')
})

test('setMapper should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setMapper, 'function')
})

test('should set and get mapper', (t) => {
  const great = new Integreat()
  const mapper = {}

  great.setMapper('map1', mapper)
  const ret = great.getMapper('map1')

  t.is(ret, mapper)
})

test('removeMapper should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeMapper, 'function')
})

test('should remove mapper', (t) => {
  const great = new Integreat()
  great.setMapper('map1', {})

  great.removeMapper('map1')

  const ret = great.getMapper('map1')
  t.is(ret, null)
})

// Tests -- source defs

test('getSource should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getSource, 'function')
})

test('setSource should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setSource, 'function')
})

test('should set and get source', (t) => {
  const great = new Integreat()
  const source = {}

  great.setSource('src1', source)
  const ret = great.getSource('src1')

  t.is(ret, source)
})

test('should set source using itemtype as id', (t) => {
  const great = new Integreat()
  const source = {itemtype: 'entry'}

  great.setSource(source)

  const ret = great.getSource('entry')
  t.is(ret, source)
})

test('removeSource should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeSource, 'function')
})

test('should remove source', (t) => {
  const great = new Integreat()
  great.setSource('src1', {})

  great.removeSource('src1')

  const ret = great.getSource('src1')
  t.is(ret, null)
})

// Tests -- load defaults

test('loadDefaults should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.loadDefaults, 'function')
})

test('should load default adapters', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  t.not(great.getAdapter('json'), null)
})

test('should load mappers', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  t.is(typeof great.getMapper('date'), 'function')
  t.is(typeof great.getMapper('float'), 'function')
  t.is(typeof great.getMapper('integer'), 'function')
})

// Tests -- getStorage

test('getStorage should exist', (t) => {
  const great = new Integreat({})

  t.is(typeof great.getStorage, 'function')
})

test('getStorage should return storage', (t) => {
  const config = {db: {url: 'http://test.base/db'}}
  const great = new Integreat(config)

  const ret = great.getStorage()

  t.is(ret.constructor.name, 'Storage')
})

test('should set db config for storage', (t) => {
  const config = {db: {url: 'http://test.base/db'}}

  const great = new Integreat(config)

  const storage = great.getStorage()
  t.deepEqual(storage._db.config, config.db)
})

// Tests -- sync source

test('_syncSource should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great._syncSource, 'function')
})

test('should sync source', (t) => {
  const great = new Integreat()
  const storage = great.getStorage()
  const source = createSource()

  return great._syncSource(source)

  .then(() => storage.fetchItem('item1', 'entry'))
  .then((item1) => {
    t.is(item1.id, 'item1')
  })
})

test('should emit sync event after syncing source', (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  const source = createSource()

  great.on('sync', listener)
  return great._syncSource(source)

  .then(() => {
    t.true(listener.calledOnce)
    t.is(listener.args[0][0], source)
    const items = listener.args[0][1]
    t.true(Array.isArray(items))
    t.is(items.length, 1)
    t.is(items[0].id, 'item1')
  })
})

test('should schedule next sync after syncing source', (t) => {
  const great = new Integreat()
  const source = createSource()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  source.nextSync = Date.now()
  const nextNextSync = source.nextSync + 3600000

  return great._syncSource(source)

  .then(() => {
    t.true(schedule.calledOnce)
    const nextSyncDate = schedule.args[0][0]
    const nextSync = nextSyncDate.getTime()
    t.is(nextSync, nextNextSync)
    const payload = schedule.args[0][1]
    t.is(payload.itemtype, 'entry')
    t.is(payload.nextSync, nextNextSync)
  })
})

// Tests -- start

test('start should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.start, 'function')
})

test('should start server and return promise of node.js server instance', (t) => {
  const config = {port: 9999}
  const great = new Integreat(config)

  return great.start()

  .then((server) => {
    t.is(server.constructor.name, 'Server')
    t.is(server.address().port, 9999)

    server.close()
  })
})

test('should emit start event on start with http', (t) => {
  const great = new Integreat({port: 9998})
  const listener = sinon.spy()
  great.on('start', listener)

  return great.start()

  .then((server) => {
    t.true(listener.calledOnce)
    t.true(listener.calledWith(server))
  })
})

test('should not start node.js server when no port is set', (t) => {
  const config = {}
  const great = new Integreat(config)

  return great.start()

  .then((server) => {
    t.is(server, null)
  })
})

test('should emit start event on start without http', (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  great.on('start', listener)

  return great.start()

  .then(() => {
    t.true(listener.calledOnce)
    t.true(listener.calledWith(null))
  })
})

test('should schedule sources on start', (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  const before = Date.now()
  // Set sources
  const sourceDef = {itemtype: 'entry', sourcetype: 'entries', sync: {schedule: 3600}}
  great.setSource('src1', sourceDef)
  great.setSource('src2', sourceDef)
  // Set adapter
  const adapter = {}
  great.setAdapter('entries', adapter)

  return great.start()

  .then(() => {
    const after = Date.now()
    t.is(schedule.callCount, 2)
    const nextSync = schedule.args[0][0].getTime()
    t.true(nextSync >= before)
    t.true(nextSync <= after)
    const payload = schedule.args[0][1]
    t.is(payload.nextSync, nextSync)
    t.is(payload.adapter, adapter)
  })
})

test('should sync sources on start', (t) => {
  const source = {}
  const great = new Integreat()
  const subscribeStub = sinon.stub(great._scheduler, 'subscribe')
  sinon.stub(great, '_syncSource').returns(Promise.resolve())
  sinon.spy(great._scheduler, 'schedule')
  // Set source def
  const sourceDef = {
    sourcetype: 'entries',
    itemtype: 'entry',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {attributes: {id: {path: 'id'}}},
    sync: {schedule: 3600}
  }
  great.setSource('entry', sourceDef)

  return great.start()

  .then(() => {
    // Assert that subscriber has been called
    t.true(subscribeStub.calledOnce)
    // Get and call what the subscriber was given
    // This would normally happen by itself, but here we are taking controll of
    // it, to be able to test its effect
    const callback = subscribeStub.args[0][0]
    return callback(source)
    // Assert that _syncSource is being called the right way
    .then(() => {
      t.true(great._syncSource.calledOnce)
      t.true(great._syncSource.calledOn(great))
      t.is(great._syncSource.args[0][0], source)
    })
  })
})

// Tests -- stop

test('stop should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.stop, 'function')
})

test('should unsubscribe from scheduler on stop', (t) => {
  const great = new Integreat()
  const dispose = sinon.spy()
  sinon.stub(great._scheduler, 'subscribe').returns({dispose})
  great.start()

  great.stop()

  t.true(dispose.calledOnce)
})

test('should unsubscribe from scheduler only first time stop is called', (t) => {
  const great = new Integreat()
  const dispose = sinon.spy()
  sinon.stub(great._scheduler, 'subscribe').returns({dispose})
  great.start()

  great.stop()
  great.stop()

  t.true(dispose.calledOnce)
})

test('should emit stop event on stop', (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  great.on('stop', listener)

  great.stop()

  t.true(listener.calledOnce)
})
