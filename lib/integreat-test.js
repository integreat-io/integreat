import test from 'ava'
import sinon from 'sinon'

import Integreat from './integreat'

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
    const nextSync = schedule.args[0][0]
    const payload = schedule.args[0][1]
    t.true(nextSync >= before)
    t.true(nextSync <= after)
    t.is(payload, source)
  })
})

test('should sync source on start', (t) => {
  // Create great instance
  const config = {db: {url: 'http://test.base/db'}}
  const great = new Integreat(config)
  const subscribeStub = sinon.stub(great._scheduler, 'subscribe')
  const storage = great.getStorage()
  // Set source
  const sourceDef = {
    sourcetype: 'entry',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {
      type: 'entry',
      attributes: {id: {path: 'id'}, name: {path: 'title'}}
    },
    sync: {schedule: 3600}
  }
  great.setSource('entry', sourceDef)
  // Set adapter
  const entryAdapter = {
    retrieve: () => Promise.resolve([{id: 'item1', title: 'First item'}]),
    normalize: (item, path) => item
  }
  great.setAdapter('entry', entryAdapter)
  // Expected item in database
  const expected1 = {id: 'item1', type: 'entry', attributes: {name: 'First item'}}

  return great.start()

  .then(() => {
    // Assert that subscriber has been called
    t.true(subscribeStub.calledOnce)
    // Get and call what the subscriber was given
    // This would normally happen by itself, but here we are taking controll of
    // it, to be able to test its effect
    const callback = subscribeStub.args[0][0]
    return callback(sourceDef)
    // Fetch item and assert that is was stored by the callback
    .then(() => storage.fetchItem('item1', 'entry'))
    .then((item1) => {
      t.deepEqual(item1, expected1)
    })
  })
})

test('should emit sync event after processing', (t) => {
  // Create great instance
  const config = {db: {url: 'http://test.base/db'}}
  const great = new Integreat(config)
  const subscribeStub = sinon.stub(great._scheduler, 'subscribe')
  const listener = sinon.spy()
  great.on('sync', listener)
  // Set source
  const sourceDef = {
    sourcetype: 'entry',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {type: 'entry', attributes: {id: {path: 'id'}}},
    sync: {schedule: 3600}
  }
  great.setSource('entry', sourceDef)
  // Set adapter
  great.setAdapter('entry', {
    retrieve: () => Promise.resolve([{id: 'item1'}]),
    normalize: (item, path) => item
  })
  const expected = [{id: 'item1', type: 'entry', attributes: {}}]

  return great.start()

  .then(() => {
    // Get and call what the subscriber was given
    // This would normally happen by itself, but here we are taking controll of
    // it, to be able to test its effect
    const callback = subscribeStub.args[0][0]
    return callback(sourceDef)
    .then(() => {
      t.true(listener.calledOnce)
      t.deepEqual(listener.args[0][0], sourceDef)
      t.deepEqual(listener.args[0][1], expected)
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
