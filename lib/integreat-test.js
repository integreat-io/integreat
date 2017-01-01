import test from 'ava'
import sinon from 'sinon'

import Integreat from './integreat'

const sourceAndAdapter = () => {
  const source = {
    sourcetype: 'entry',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {type: 'entry', attributes: {id: {path: 'id'}}},
    sync: {schedule: 3600}
  }
  const adapter = {
    retrieve: () => Promise.resolve([{id: 'item1'}]),
    normalize: (item, path) => item
  }

  return {source, adapter}
}

// Tests

test('should exist', (t) => {
  t.is(typeof Integreat, 'function')
})

test('class should have version number', (t) => {
  t.is(Integreat.version, '0.1')
})

test('instance should have version number', (t) => {
  const great = new Integreat()

  t.is(great.version, '0.1')
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

// Tests -- parsers

test('getParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getParser, 'function')
})

test('setParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setParser, 'function')
})

test('should set and get parser', (t) => {
  const great = new Integreat()
  const parser = {}

  great.setParser('pars1', parser)
  const ret = great.getParser('pars1')

  t.is(ret, parser)
})

test('removeParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeParser, 'function')
})

test('should remove parser', (t) => {
  const great = new Integreat()
  great.setParser('pars1', {})

  great.removeParser('pars1')

  const ret = great.getParser('pars1')
  t.is(ret, null)
})

// Tests -- formatters

test('getFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getFormatter, 'function')
})

test('setFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setFormatter, 'function')
})

test('should set and get formatter', (t) => {
  const great = new Integreat()
  const formatter = {}

  great.setFormatter('form1', formatter)
  const ret = great.getFormatter('form1')

  t.is(ret, formatter)
})

test('removeFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeFormatter, 'function')
})

test('should remove formatter', (t) => {
  const great = new Integreat()
  great.setFormatter('form1', {})

  great.removeFormatter('form1')

  const ret = great.getFormatter('form1')
  t.is(ret, null)
})

// Tests -- transformers

test('getTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getTransformer, 'function')
})

test('setTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setTransformer, 'function')
})

test('should set and get transformer', (t) => {
  const great = new Integreat()
  const transformer = {}

  great.setTransformer('trans1', transformer)
  const ret = great.getTransformer('trans1')

  t.is(ret, transformer)
})

test('removeTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeTransformer, 'function')
})

test('should remove transformer', (t) => {
  const great = new Integreat()
  great.setTransformer('trans1', {})

  great.removeTransformer('trans1')

  const ret = great.getTransformer('trans1')
  t.is(ret, null)
})

// Tests -- sources

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

test('should load parsers', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  t.is(typeof great.getParser('date'), 'function')
  t.is(typeof great.getParser('float'), 'function')
  t.is(typeof great.getParser('integer'), 'function')
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
  const {source, adapter} = sourceAndAdapter()
  great.setAdapter('entry', adapter)

  return great._syncSource(source)

  .then(() => storage.fetchItem('item1', 'entry'))
  .then((item1) => {
    t.is(item1.id, 'item1')
  })
})

test('should emit sync event after syncing source', (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  const {source, adapter} = sourceAndAdapter()
  great.setAdapter('entry', adapter)

  great.on('sync', listener)
  return great._syncSource(source)

  .then(() => {
    t.true(listener.calledOnce)
    t.deepEqual(listener.args[0][0], source)
    const items = listener.args[0][1]
    t.true(Array.isArray(items))
    t.is(items.length, 1)
    t.is(items[0].id, 'item1')
  })
})

test('should schedule next sync after syncing source', (t) => {
  const great = new Integreat()
  const {source, adapter} = sourceAndAdapter()
  great.setAdapter('entry', adapter)
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
    t.is(payload.sync, source.sync)
    t.deepEqual(payload, Object.assign({}, source, {nextSync: nextNextSync}))
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
  const source = {sync: {schedule: 3600}}
  great.setSource('src1', source)
  great.setSource('src2', source)
  const schedule = sinon.stub(great._scheduler, 'schedule')
  const before = Date.now()

  return great.start()

  .then(() => {
    const after = Date.now()
    t.true(schedule.calledTwice)
    const nextSyncDate = schedule.args[0][0]
    const nextSync = nextSyncDate.getTime()
    t.true(nextSync >= before)
    t.true(nextSync <= after)
    const payload = schedule.args[0][1]
    t.is(payload.sync, source.sync)
    t.is(payload.nextSync, nextSync)
  })
})

test('should sync sources on start', (t) => {
  // Create great instance
  const great = new Integreat()
  const subscribeStub = sinon.stub(great._scheduler, 'subscribe')
  sinon.stub(great, '_syncSource').returns(Promise.resolve())
  // Set source
  const sourceDef = {
    sourcetype: 'entry',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {type: 'entry', attributes: {id: {path: 'id'}}},
    sync: {schedule: 3600}
  }
  great.setSource('entry', sourceDef)
  // Expected item in database

  return great.start()

  .then(() => {
    // Assert that subscriber has been called
    t.true(subscribeStub.calledOnce)
    // Get and call what the subscriber was given
    // This would normally happen by itself, but here we are taking controll of
    // it, to be able to test its effect
    const callback = subscribeStub.args[0][0]
    return callback(sourceDef)
    // Assert that _syncSource is being called
    .then(() => {
      t.true(great._syncSource.calledOnce)
      t.true(great._syncSource.calledWith(sourceDef))
      t.true(great._syncSource.calledOn(great))
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
