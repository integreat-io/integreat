import test from 'ava'
import dotProp from 'dot-prop'
import Item from './item'
import Attribute from './attribute'

import Source from '.'

// Helpers

const mockdapter = {
  normalize: (source, path) => Promise.resolve(dotProp.get(source, path))
}

// Tests -- mapFromSource

test('should exist', (t) => {
  const source = new Source('entry')

  t.is(typeof source.mapFromSource, 'function')
})

test('should normalize data', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    items: [{id: 'item1'}, {id: 'item2'}]
  }
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef

  const ret = await source.mapFromSource(data, 'entry')

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should return empty array when no data', async (t) => {
  const source = new Source('entries', mockdapter)
  source.items.entry = new Item('entry')

  const items = await source.mapFromSource(null, 'entry')

  t.deepEqual(items, [])
})

test('should return empty array when no itemDef', async (t) => {
  const source = new Source('entries', mockdapter)

  const items = await source.mapFromSource({data: [{id: 'item1'}]}, null)

  t.deepEqual(items, [])
})

test('should return empty array when no adapter', async (t) => {
  const source = new Source('entries')
  source.items.entry = new Item('entry')

  const items = await source.mapFromSource({data: [{id: 'item1'}]}, 'entry')

  t.deepEqual(items, [])
})

test('should return empty array when normalize returns null', async (t) => {
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve(null)
  }
  const source = new Source('entries', adapter)
  source.items.entry = new Item('entry')

  const items = await source.mapFromSource({items: [{id: 'item1'}]}, 'entry')

  t.deepEqual(items, [])
})

test('should handle normalize returning object instead of array', async (t) => {
  const adapter = {
    retrieve: () => Promise.resolve([]),
    normalize: () => Promise.resolve({id: 'item1'})
  }
  const source = new Source('entries', adapter)
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = itemDef

  const items = await source.mapFromSource({items: [{id: 'item1'}]}, 'entry')

  t.is(items.length, 1)
  t.is(items[0].id, 'item1')
})

test('should map items with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', 'string', 'id'))
  itemDef.attributes.push(new Attribute('name', 'string', 'title'))
  source.items.entry = itemDef

  const ret = await source.mapFromSource(data, 'entry')

  t.is(ret[0].id, 'item1')
  t.is(ret[0].attributes.name, 'First item')
  t.is(typeof ret[0].attributes.title, 'undefined')
})

test('should filter items with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const itemDef = new Item('entries', 'items')
  itemDef.attributes.push(new Attribute('id', 'string', 'id'))
  itemDef.filter.push(() => true)
  itemDef.filter.push(() => false)
  source.items.entry = itemDef

  const ret = await source.mapFromSource(data, 'entry')

  t.deepEqual(ret, [])
})

test('should normalize with all item defs', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    item1: [{id: 'item1'}],
    item2: [{id: 'item2'}]
  }
  const itemDef1 = new Item('entry', 'item1')
  itemDef1.attributes.push(new Attribute('id', null, 'id'))
  source.items['entry'] = itemDef1
  const itemDef2 = new Item('item', 'item2')
  itemDef2.attributes.push(new Attribute('id', null, 'id'))
  source.items['item'] = itemDef2

  const ret = await source.mapFromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})