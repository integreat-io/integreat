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

// Tests

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
  source.items.entry = item

  const ret = await source.fetchItems()

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].id, 'item1')
  t.is(ret[1].id, 'item2')
})

test('should fetch from source with given endpoint', async (t) => {
  const source = new Source('ent1', mockdapter)
  const endpoint = 'http://some.api/1.0/'
  const item = new Item('entry', 'data')
  item.attributes.push(new Attribute('id', null, 'id'))
  source.items.entry = item

  const ret = await source.fetchItems(endpoint)

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
  source.items.entry = new Item('entry')

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
  source.items.entry = item1
  const item2 = new Item('note', 'note.path')
  item2.attributes.push(new Attribute('title', 'string', 'title'))
  source.items.note = item2

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
  source.items.entry = item

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
  source.items.entry = item

  const ret = await source.fetchItems()

  t.deepEqual(ret, [])
})
