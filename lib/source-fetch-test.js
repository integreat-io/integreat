import test from 'ava'
import sinon from 'sinon'
import dotProp from 'dot-prop'
import ItemMapper from './itemMapper'
import ValueMapper from './valueMapper'

import Source from './source'

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
  const endpoint = 'http://some.api/1.0/'

  const items = await source.fetchItems(endpoint)

  t.deepEqual(items, [])
})

test('should fetch from source with given endpoint', async (t) => {
  const source = new Source('ent1', mockdapter)
  const endpoint = 'http://some.api/1.0/'
  const item = new ItemMapper('entry', 'data')
  item.attrMappers.push(new ValueMapper('id', null, 'id'))
  source.itemMappers.entry = item

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
  const endpoint = 'http://some.api/1.0/'
  source.fetch = {
    auth
  }
  source.itemMappers.entry = new ItemMapper('entry')

  await source.fetchItems(endpoint)

  t.true(spydapter.retrieve.calledOnce)
  t.is(spydapter.retrieve.args[0][1], auth)
})

test('should fetch with more items', async (t) => {
  const adapter = {
    retrieve: () => Promise.resolve({}),
    normalize: (source, path) => Promise.resolve([{title: path}])
  }
  const source = new Source('ent1', adapter)
  const endpoint = 'http://some.api/1.0/'
  const item1 = new ItemMapper('entry', 'entry.path')
  item1.attrMappers.push(new ValueMapper('title', 'string', 'title'))
  source.itemMappers.entry = item1
  const item2 = new ItemMapper('note', 'note.path')
  item2.attrMappers.push(new ValueMapper('title', 'string', 'title'))
  source.itemMappers.note = item2

  const ret = await source.fetchItems(endpoint)

  t.is(ret.length, 2)
  t.is(ret[0].type, 'entry')
  t.is(ret[0].attributes.title, 'entry.path')
  t.is(ret[1].type, 'note')
  t.is(ret[1].attributes.title, 'note.path')
})

test('should map source', async (t) => {
  const source = new Source('ent1', mockdapter)
  const endpoint = 'http://some.api/1.0/'
  const item = new ItemMapper('entry', 'data')
  item.attrMappers.push(new ValueMapper('id', 'string', 'id'))
  item.attrMappers.push(new ValueMapper('name', 'string', 'title'))
  source.itemMappers.entry = item

  const ret = await source.fetchItems(endpoint)

  t.is(ret[0].attributes.name, 'First item')
  t.is(typeof ret[0].attributes.title, 'undefined')
})

test('should filter items', async (t) => {
  const source = new Source('ent1', mockdapter)
  const endpoint = 'http://some.api/1.0/'
  const item = new ItemMapper('entry', 'data')
  item.attrMappers.push(new ValueMapper('id', 'string', 'id'))
  item.filters.from.push(() => true)
  item.filters.from.push(() => false)
  source.itemMappers.entry = item

  const ret = await source.fetchItems(endpoint)

  t.deepEqual(ret, [])
})
