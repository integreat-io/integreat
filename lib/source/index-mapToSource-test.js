import test from 'ava'
import Item from './item'
import Attribute from './attribute'

import Source from '.'

// Helpers

const mockdapter = {
  serialize: (data, path) => ({[path]: Object.assign({}, data, {_id: data.id})})
}

// Tests

test('should exist', (t) => {
  const source = new Source()

  t.is(typeof source.mapToSource, 'function')
})

test('should serialize data', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id'))
  itemDef.attributes.push(new Attribute('type'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.mapToSource(data)

  t.truthy(ret)
  t.truthy(ret.data)
  t.is(ret.data._id, 'ent1')
  t.is(ret.data.type, 'entry')
})

test('should return null when no matching item def', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.mapToSource(data)

  t.is(ret, null)
})

test('should return null when no adapter', async (t) => {
  const source = new Source('entries')
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.mapToSource(data)

  t.is(ret, null)
})

test('should return null when no data', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id'))
  source.items.entry = itemDef

  const ret = await source.mapToSource()

  t.is(ret, null)
})

test('should map item with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id'))
  itemDef.attributes.push(new Attribute('type'))
  itemDef.attributes.push(new Attribute('name', null, 'title'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry', attributes: {name: 'Entry 1'}}

  const ret = await source.mapToSource(data)

  t.truthy(ret.data)
  t.is(ret.data.title, 'Entry 1')
  t.is(ret.data.attributes, undefined)
  t.is(ret.data.type, 'entry')
})

test('should filter item with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id'))
  itemDef.filters.to.push(() => true)
  itemDef.filters.to.push(() => false)
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.mapToSource(data)

  t.is(ret, null)
})
