import test from 'ava'
import sinon from 'sinon'
const Source = require('./source')
const Item = require('./source/item')
const Attribute = require('./source/attribute')

import Integreat from './integreat'

const createSource = () => {
  const adapter = {
    retrieve: () => Promise.resolve([{id: 'item1'}]),
    normalize: (item, path) => Promise.resolve(item)
  }
  const source = new Source('src1', adapter)
  source.fetch = {endpoint: 'http://some.api/entries/'}
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(item)
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

// Tests -- collections

test('sources should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.sources)
  t.is(great.sources.constructor.name, 'Sources')
})

test('adapters should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.adapters)
  t.is(great.adapters.constructor.name, 'Map')
})

test('mappers should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.mappers)
  t.is(great.mappers.constructor.name, 'Map')
})

test('filters should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.filters)
  t.is(great.filters.constructor.name, 'Map')
})

test('authConfigs should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.authConfigs)
  t.is(great.authConfigs.constructor.name, 'Map')
})

test('authStrats should exist', (t) => {
  const great = new Integreat()

  t.truthy(great.authStrats)
  t.is(great.authStrats.constructor.name, 'Map')
})

// Tests -- live auth

test('getLiveAuth should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getLiveAuth, 'function')
})

test('getLiveAuth should return live auth', (t) => {
  const great = new Integreat()
  const auth = {}
  great._liveAuths.set('theauth', auth)

  const ret = great.getLiveAuth('theauth')

  t.is(ret, auth)
})

// Tests -- load defaults

test('loadDefaults should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.loadDefaults, 'function')
})

test('should load defaults', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  // Check for an adapter we know will be there - the rest is tested in
  // utils/loadDefaults-test.js
  t.not(great.adapters.get('json'), null)
})

// Tests -- loadSourceDefsFromDb

test('loadSourceDefsFromDb should exist', (t) => {
  const great = new Integreat({})

  t.is(typeof great.loadSourceDefsFromDb, 'function')
})

test('loadSourceDefsFromDb should set source defs', async (t) => {
  const great = new Integreat({})
  const sourceDefs = [
    {id: 'source:src1', type: 'source', adapter: 'json', _key: 'entry'},
    {id: 'source:src2', type: 'source', adapter: 'ad', _key: 'account'}
  ]
  great._db.data.set('view:great:sources', sourceDefs)

  await great.loadSourceDefsFromDb()

  const src1 = great.sources.get('src1')
  t.truthy(src1)
  t.is(src1.adapter, 'json')
  const src2 = great.sources.get('src2')
  t.truthy(src2)
  t.is(src2.adapter, 'ad')
})

test('loadSourceDefsFromDb should return source defs', async (t) => {
  const great = new Integreat({})
  const sourceDefs = [
    {id: 'source:src1', type: 'source', _key: 'entry'},
    {id: 'source:src2', type: 'source', _key: 'account'}
  ]
  great._db.data.set('view:great:sources', sourceDefs)

  const ret = await great.loadSourceDefsFromDb()

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'src1')
  t.is(ret[1].id, 'src2')
})

// Tests -- connect

test('connect should exist', (t) => {
  const great = new Integreat({})

  t.is(typeof great.connect, 'function')
})

test('connect should give access to store', async (t) => {
  const great = new Integreat()
  great._db.data.set('entry:ent1', {id: 'entry:ent1', type: 'item', itemtype: 'entry'})

  const entries = great.connect('entry')
  const entry = await entries.get('ent1')

  t.truthy(entry)
  t.is(entry.id, 'ent1')
})

// Tests -- sync source

test('_syncSource should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great._syncSource, 'function')
})

test('should sync source', async (t) => {
  const great = new Integreat()
  const source = createSource()
  const connector = great.connect('entry')

  await great._syncSource(source)

  const item1 = await connector.get('item1')
  t.is(item1.id, 'item1')
})

test('should continue sync source when processSource throws', (t) => {
  const great = new Integreat()
  const source = createSource()
  great._db.data.set('entry:item1', new Error('Something colided'))

  t.notThrows(async () => {
    await great._syncSource(source)
  })
})

test('should emit sync event after syncing source', async (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  const source = createSource()

  great.on('sync', listener)
  await great._syncSource(source)

  t.true(listener.calledOnce)
  t.is(listener.args[0][0], source)
  const items = listener.args[0][1]
  t.true(Array.isArray(items))
  t.is(items.length, 1)
  t.is(items[0].id, 'item1')
})

test('should schedule next sync after syncing source', async (t) => {
  const great = new Integreat()
  const source = createSource()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  source.nextSync = Date.now()
  const nextNextSync = source.nextSync + 3600000

  await great._syncSource(source)

  t.true(schedule.calledOnce)
  const nextSyncDate = schedule.args[0][0]
  const nextSync = nextSyncDate.getTime()
  t.is(nextSync, nextNextSync)
  const payload = schedule.args[0][1]
  t.is(payload.id, 'src1')
  t.is(payload.nextSync, nextNextSync)
})

// Tests -- start

test('start should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.start, 'function')
})

test('should start server and return promise of node.js server instance', async (t) => {
  const config = {port: 9999}
  const great = new Integreat(config)

  const server = await great.start()

  t.is(server.constructor.name, 'Server')
  t.is(server.address().port, 9999)

  server.close()
})

test('should emit start event on start with http', async (t) => {
  const great = new Integreat({port: 9998})
  const listener = sinon.spy()
  great.on('start', listener)

  const server = await great.start()

  t.true(listener.calledOnce)
  t.true(listener.calledWith(server))
})

test('should not start node.js server when no port is set', async (t) => {
  const config = {}
  const great = new Integreat(config)

  const server = await great.start()

  t.is(server, null)
})

test('should emit start event on start without http', async (t) => {
  const great = new Integreat()
  const listener = sinon.spy()
  great.on('start', listener)

  await great.start()

  t.true(listener.calledOnce)
  t.true(listener.calledWith(null))
})

test('should schedule sources on start', async (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  const before = Date.now()
  // Set sources
  const sourceDef = {id: 'entry1', adapter: 'entries', sync: {schedule: 3600}}
  great.sources.set('src1', sourceDef)
  great.sources.set('src2', sourceDef)

  await great.start()

  const after = Date.now()
  t.is(schedule.callCount, 2)
  const nextSync = schedule.args[0][0].getTime()
  t.true(nextSync >= before)
  t.true(nextSync <= after)
  const payload = schedule.args[0][1]
  t.is(payload.nextSync, nextSync)
})

test('should set adapter on sources on start', async (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  // Set sources
  const sourceDef = {id: 'entry1', adapter: 'entries', sync: {schedule: 3600}}
  great.sources.set('src1', sourceDef)
  // Set adapter
  const adapter = {}
  great.adapters.set('entries', adapter)

  await great.start()

  const payload = schedule.args[0][1]
  t.is(payload.adapter, adapter)
})

test('should set mappers on sources on start', async (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  // Set sources
  const sourceDef = {
    id: 'entry1',
    adapter: 'entries',
    items: [{map: ['map1']}],
    sync: {schedule: 3600}
  }
  great.sources.set('src1', sourceDef)
  // Set mapper
  const mapper = {}
  great.mappers.set('map1', mapper)

  await great.start()

  const payload = schedule.args[0][1]
  const item = payload.items[0]
  t.is(item.map.length, 1)
  t.is(item.map[0], mapper)
})

test('should set filters on sources on start', async (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  // Set sources
  const sourceDef = {
    id: 'entry1',
    adapter: 'entries',
    items: [{filter: ['filt1']}],
    sync: {schedule: 3600}
  }
  great.sources.set('src1', sourceDef)
  // Set filter
  const filter = {}
  great.filters.set('filt1', filter)

  await great.start()

  const payload = schedule.args[0][1]
  const item = payload.items[0]
  t.is(item.filter.length, 1)
  t.is(item.filter[0], filter)
})

test('should set auth on sources on start', async (t) => {
  const great = new Integreat()
  const schedule = sinon.stub(great._scheduler, 'schedule')
  // Set sources
  const sourceDef = {
    id: 'entry1',
    adapter: 'entries',
    fetch: {auth: 'auth1'},
    sync: {schedule: 3600}
  }
  great.sources.set('src1', sourceDef)
  // Set auth
  const auth = {}
  sinon.stub(great, 'getLiveAuth').returns(auth)

  await great.start()

  const payload = schedule.args[0][1]
  t.is(payload.fetch.auth, auth)
  t.true(great.getLiveAuth.calledWith('auth1'))
})

test('should create live auth objects on start', async (t) => {
  class TestStrategy {
    constructor (options) {
      this.options = options
    }
  }
  const authDef = {
    id: 'mytweets',
    strategy: 'twitter',
    options: {
      key: 'testkey',
      secret: 'secret'
    }
  }
  const great = new Integreat()
  great.authStrats.set('twitter', TestStrategy)
  great.authConfigs.set('mytweets', authDef)

  await great.start()

  const auth = great.getLiveAuth('mytweets')
  t.not(auth, null)
  t.is(auth.constructor.name, 'TestStrategy')
  t.is(auth.options, authDef.options)
})

test('should not throw on unknown auth strat', (t) => {
  const authDef = {
    id: 'auth1',
    strategy: 'unknown'
  }
  const great = new Integreat()
  great.authConfigs.set('auth1', authDef)

  t.notThrows(async () => {
    await great.start()
  })
})

test('should sync sources on start', async (t) => {
  const source = {}
  const great = new Integreat()
  const subscribeStub = sinon.stub(great._scheduler, 'subscribe')
  sinon.stub(great, '_syncSource').returns(Promise.resolve())
  sinon.spy(great._scheduler, 'schedule')
  // Set source def
  const sourceDef = {
    id: 'entry1',
    adapter: 'entries',
    fetch: {endpoint: 'http://some.api/entries/'},
    item: {attributes: {id: {path: 'id'}}},
    sync: {schedule: 3600}
  }
  great.sources.set('entry', sourceDef)

  await great.start()

  // Assert that subscriber has been called
  t.true(subscribeStub.calledOnce)
  // Get and call what the subscriber was given
  // This would normally happen by itself, but here we are taking controll of
  // it, to be able to test its effect
  const callback = subscribeStub.args[0][0]
  await callback(source)
  // Assert that _syncSource is being called the right way
  t.true(great._syncSource.calledOnce)
  t.true(great._syncSource.calledOn(great))
  t.is(great._syncSource.args[0][0], source)
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

// Tests -- dispatch

test('dispatch should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.dispatch, 'function')
})

test('should call actionHandler with action and sources', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const source = {
    getEndpointOne: () => 'http://api.test/entry:ent1',
    fetchItems: () => items
  }
  const great = new Integreat()
  great.sources.set('entries', source)
  const action = {type: 'GET', payload: {id: 'ent1', type: 'entry', source: 'entries'}}

  const ret = await great.dispatch(action)

  t.deepEqual(ret, items)
})

test('should return null when dispatching without an action', async (t) => {
  const great = new Integreat()

  const ret = await great.dispatch()

  t.is(ret, null)
})
