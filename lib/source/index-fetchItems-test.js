import test from 'ava'
import sinon from 'sinon'
import dotProp from 'dot-prop'
import Item from './item'
import Attribute from './attribute'

import Source from '.'

// Helpers

const mockdapter = {
  retrieve: () => Promise.resolve({
    data: [
      {
        id: 'item1',
        title: 'First item'
      },
      {
        id: 'item2',
        title: 'Second item'
      }
    ]
  }),

  normalize: (source, path) => Promise.resolve(dotProp.get(source, path))
}

// Tests -- normalizeMapFilter

test('should exist', (t) => {
  const source = new Source('entry')

  t.is(typeof source.normalizeMapFilter, 'function')
})

test('should normalize data', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    items: [{id: 'item1'}, {id: 'item2'}]
  }
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', null, 'id'))

  const ret = await source.normalizeMapFilter(data, itemDef)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should return empty array when no data', async (t) => {
  const source = new Source('entries', mockdapter)

  const items = await source.normalizeMapFilter(null, new Item('entry'))

  t.deepEqual(items, [])
})

test('should return empty array when no itemDef', async (t) => {
  const source = new Source('entries', mockdapter)

  const items = await source.normalizeMapFilter({data: [{id: 'item1'}]}, null)

  t.deepEqual(items, [])
})

test('should return empty array when no adapter', async (t) => {
  const source = new Source('entries')

  const items = await source.normalizeMapFilter({data: [{id: 'item1'}]}, new Item('entry'))

  t.deepEqual(items, [])
})

test('should map items with itemDef', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    items: [{id: 'item1', title: 'First item'}, {id: 'item2', item: 'Second'}]
  }
  const itemDef = new Item('entry', 'items')
  itemDef.attributes.push(new Attribute('id', 'string', 'id'))
  itemDef.attributes.push(new Attribute('name', 'string', 'title'))

  const ret = await source.normalizeMapFilter(data, itemDef)

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

  const ret = await source.normalizeMapFilter(data, itemDef)

  t.deepEqual(ret, [])
})

test('should normalize data', async (t) => {
  const source = new Source('entries', mockdapter)
  const data = {
    item1: [{id: 'item1'}],
    item2: [{id: 'item2'}]
  }
  const itemDef1 = new Item('entry', 'item1')
  itemDef1.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef1)
  const itemDef2 = new Item('entry', 'item2')
  itemDef2.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(itemDef2)

  const ret = await source.normalizeMapFilter(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

// Tests -- fetchItems

test('should exist', (t) => {
  const source = new Source('entry')

  t.is(typeof source.fetchItems, 'function')
})

test('should return empty array when no adapter', async (t) => {
  const source = new Source('ent1')

  const items = await source.fetchItems()

  t.deepEqual(items, [])
})

test('should fetch from source', async (t) => {
  const source = new Source('ent1', mockdapter)
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  const item = new Item('entry', 'data')
  item.attributes.push(new Attribute('id', null, 'id'))
  source.items.push(item)

  const ret = await source.fetchItems()

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should fetch with auth', async (t) => {
  const auth = {}
  const spydapter = {
    retrieve: sinon.stub().returns(Promise.resolve([])),
    normalize: () => Promise.resolve([])
  }
  const source = new Source('ent1', spydapter)
  source.fetch = {
    endpoint: 'http://some.api/1.0/',
    auth
  }
  source.items.push(new Item('entry'))

  await source.fetchItems()

  t.true(spydapter.retrieve.calledOnce)
  t.is(spydapter.retrieve.args[0][1], auth)
})

test('should fetch with more items', async (t) => {
  const adapter = {
    retrieve: () => Promise.resolve({}),
    normalize: (source, path) => Promise.resolve([{title: path}])
  }
  const source = new Source('ent1', adapter)
  source.fetch = {endpoint: 'http://some.api/1.0/'}
  const item1 = new Item('entry', 'entry.path')
  item1.attributes.push(new Attribute('title', 'string', 'title'))
  source.items.push(item1)
  const item2 = new Item('note', 'note.path')
  item2.attributes.push(new Attribute('title', 'string', 'title'))
  source.items.push(item2)

  const ret = await source.fetchItems()

  t.is(ret.length, 2)
  t.is(ret[0].type, 'entry')
  t.is(ret[0].attributes.title, 'entry.path')
  t.is(ret[1].type, 'note')
  t.is(ret[1].attributes.title, 'note.path')
})

test('should map source', async (t) => {
  const source = new Source('ent1', mockdapter)
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  const item = new Item('entry', 'data')
  item.attributes.push(new Attribute('id', 'string', 'id'))
  item.attributes.push(new Attribute('name', 'string', 'title'))
  source.items.push(item)

  const ret = await source.fetchItems()

  t.is(ret[0].attributes.name, 'First item')
  t.is(typeof ret[0].attributes.title, 'undefined')
})

test('should filter items', async (t) => {
  const source = new Source('ent1', mockdapter)
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  const item = new Item('entry', 'data')
  item.attributes.push(new Attribute('id', 'string', 'id'))
  item.filter.push(() => true)
  item.filter.push(() => false)
  source.items.push(item)

  const ret = await source.fetchItems()

  t.deepEqual(ret, [])
})
