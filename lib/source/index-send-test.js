import test from 'ava'
import sinon from 'sinon'
import Item from './item'
import Attribute from './attribute'

import Source from '.'

// Helpers

const okayResponse = {status: 200, data: {okay: true}}

// Tests

test('should exist', (t) => {
  const source = new Source()

  t.is(typeof source.sendItems, 'function')
})

test('should send to source', async (t) => {
  const adapter = {
    serialize: (data) => Object.assign({}, data, {_id: data.id}),
    send: sinon.stub().returns(Promise.resolve(okayResponse))
  }
  const source = new Source('entries', adapter)
  const endpoint = 'http://api1.test/entries/ent1'
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.sendItems(data, endpoint)

  t.true(adapter.send.calledOnce)
  const args = adapter.send.args[0]
  t.is(args[0], endpoint)
  t.truthy(args[1])
  t.is(args[1]._id, 'ent1')
  t.truthy(ret)
  t.is(ret.status, 200)
})

test('should return when no data', async (t) => {
  const adapter = {
    serialize: (data) => data,
    send: sinon.stub().returns(Promise.resolve(okayResponse))
  }
  const source = new Source('entries', adapter)
  const endpoint = 'http://api1.test/entries/ent1'
  const itemDef = new Item('entry')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef

  const ret = await source.sendItems(null, endpoint)

  t.false(adapter.send.called)
  t.is(ret, null)
})

test('should return when no endpoint', async (t) => {
  const adapter = {
    serialize: (data) => data,
    send: sinon.stub().returns(Promise.resolve(okayResponse))
  }
  const source = new Source('entries', adapter)
  const itemDef = new Item('entry')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.sendItems(data)

  t.false(adapter.send.called)
  t.is(ret, null)
})

test('should return when no adapter', async (t) => {
  const source = new Source('entries')
  const endpoint = 'http://api1.test/entries/ent1'
  const itemDef = new Item('entry')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  try {
    await source.sendItems(data, endpoint)
  } catch (err) {
    t.fail()
  }
  t.pass()
})
