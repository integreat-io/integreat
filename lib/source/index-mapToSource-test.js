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
  itemDef.attributes.push(new Attribute('id', null, 'id'))
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
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry'}

  const ret = await source.mapToSource(data)

  t.is(ret, null)
})

test('should return null when no data', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef

  const ret = await source.mapToSource()

  t.is(ret, null)
})

test.skip('should map item with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const itemDef = new Item('entry', 'data')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  itemDef.attributes.push(new Attribute('name', null, 'title'))
  source.items.entry = itemDef
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'Entry 1'}}

  const ret = await source.mapToSource(data)

  t.truthy(ret.data)
  t.is(ret.data.name, 'Entry 1')
  t.is(typeof ret.data.attributes, undefined)
})

test.todo('should filter item with itemDef')
