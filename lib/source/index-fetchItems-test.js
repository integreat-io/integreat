import test from 'ava'
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

  normalize: (item, path) => Promise.resolve(dotProp.get(item, path))
}

// Tests -- fetchItems

test('should exist', (t) => {
  const source = new Source('entry')

  t.is(typeof source.fetchItems, 'function')
})

test('should return empty array when no adapter', (t) => {
  const source = new Source('ent1')

  return source.fetchItems()

  .then((items) => [
    t.deepEqual(items, [])
  ])
})

test('should fetch from source', (t) => {
  const source = new Source('ent1')
  source.adapter = mockdapter
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  source.item = new Item('entry', 'data')
  source.item.attributes.push(new Attribute('id', null, 'id'))

  return source.fetchItems()

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 2)
    t.is(ret[0].id, 'item1')
    t.is(ret[1].id, 'item2')
  })
})

test('should map source', (t) => {
  const source = new Source('ent1')
  source.adapter = mockdapter
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  const item = new Item('entry', 'data')
  item.attributes.push(new Attribute('id', 'string', 'id'))
  item.attributes.push(new Attribute('name', 'string', 'title'))
  source.item = item

  return source.fetchItems()

  .then((ret) => {
    t.is(ret[0].attributes.name, 'First item')
    t.is(typeof ret[0].attributes.title, 'undefined')
  })
})

test('should filter items', (t) => {
  const source = new Source('ent1')
  source.adapter = mockdapter
  source.fetch = {
    endpoint: 'http://some.api/1.0/'
  }
  source.item = new Item('entry', 'data')
  source.item.attributes.push(new Attribute('id', 'string', 'id'))
  source.item.filter.push((item) => true)
  source.item.filter.push((item) => false)

  return source.fetchItems()

  .then((ret) => {
    t.deepEqual(ret, [])
  })
})
