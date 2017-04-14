import test from 'ava'
import Item from './item'
import Attribute from './attribute'

import Source from '.'

test('should exist', (t) => {
  const source = new Source()

  t.is(typeof source.serializeMapFilter, 'function')
})

test('should serialize data', async (t) => {
  const adapter = {
    serialize: (data, path) => ({[path]: Object.assign({}, data, {_id: data.id})})
  }
  const source = new Source('entries', adapter)
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.serializeMapFilter(data)

  t.truthy(ret)
  t.truthy(ret.items)
  t.is(ret.items._id, 'ent1')
  t.is(ret.items.type, 'entry')
})

test('should return null when no matching item def', async (t) => {
  const adapter = {
    serialize: (data, path) => ({[path]: Object.assign({}, data, {_id: data.id})})
  }
  const source = new Source('entries', adapter)
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.serializeMapFilter(data)

  t.is(ret, null)
})

test('should return null when no adapter', async (t) => {
  const source = new Source('entries')
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.serializeMapFilter(data)

  t.is(ret, null)
})

test('should return null when no data', async (t) => {
  const adapter = {
    serialize: (data, path) => ({[path]: Object.assign({}, data, {_id: data.id})})
  }
  const source = new Source('entries', adapter)
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef

  const ret = await source.serializeMapFilter()

  t.is(ret, null)
})
