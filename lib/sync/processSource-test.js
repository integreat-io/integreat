import test from 'ava'
import sinon from 'sinon'
import {couchdb as Dbdb} from 'dbdbmock'
import Connector from '../connector'
import Source from '../source'
import Item from '../source/item'
import Attribute from '../source/attribute'

import processSource from './processSource'

// Helpers

const createSource = (adapter = null) => {
  const source = new Source('entry1', adapter)
  source.fetch = {endpoint: 'http://some.api/entries/', auth: {}}
  const item = new Item('entry')
  item.attributes.push(new Attribute('id', null, 'id'))
  item.attributes.push(new Attribute('name', null, 'title'))
  item.attributes.push(new Attribute('createdAt', null, 'createdAt'))
  item.attributes.push(new Attribute('updatedAt', null, 'updatedAt'))
  source.items.push(item)
  return source
}

const mockdate = Date.now()

const mockdapter = {
  retrieve: () => Promise.resolve([
    {id: 'item1', title: 'First item', createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', title: 'Second item', createdAt: mockdate, updatedAt: mockdate}
  ]),

  normalize: (item, path) => Promise.resolve(item)
}

// Tests

test('should exist', (t) => {
  t.is(typeof processSource, 'function')
})

test('should retrieve, map, and return items', (t) => {
  const source = createSource(mockdapter)
  const expectedAttrs = {name: 'First item'}

  return processSource(source)

  .then((items) => {
    t.true(Array.isArray(items))
    t.is(items.length, 2)
    const item1 = items[0]
    t.is(item1.id, 'item1')
    t.is(item1.type, 'entry')
    t.deepEqual(item1.attributes, expectedAttrs)
    t.is(item1.createdAt, mockdate)
    t.is(item1.updatedAt, mockdate)
  })
})

test('should retrieve, map, and return items with relationship', (t) => {
  const adapter = {
    retrieve: () => Promise.resolve([
      {id: 'item1', title: 'First item', comments: ['com1', 'com3']},
      {id: 'item2', title: 'Second item', comments: ['com2', 'com4']}
    ]),

    normalize: (item, path) => Promise.resolve(item)
  }
  const source = createSource(adapter)
  source.items[0].relationships.push(new Attribute('comments', 'comment', 'comments'))

  return processSource(source)

  .then((items) => {
    t.truthy(items[0].relationships)
    const comments = items[0].relationships.comments
    t.true(Array.isArray(comments))
    t.is(comments[0].id, 'com1')
    t.is(comments[0].type, 'comment')
    t.is(comments[1].id, 'com3')
  })
})

test('should reject when no source definition', (t) => {
  t.plan(2)

  return processSource(null)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No valid source definition')
  })
})

test('should fetch through adapter with endpoint and auth', (t) => {
  const spydapter = {
    retrieve: sinon.stub().returns(Promise.resolve([])),
    normalize: () => Promise.resolve([])
  }
  const source = createSource(spydapter)

  return processSource(source)

  .then((items) => {
    t.true(spydapter.retrieve.calledOnce)
    t.true(spydapter.retrieve.calledWith(
      source.fetch.endpoint,
      source.fetch.auth
    ))
  })
})

// Tests -- store

test('should store items', (t) => {
  const source = createSource(mockdapter)
  const db = new Dbdb()
  const connect = new Connector(db, 'entry')

  return processSource(source, connect)

  .then((items) => {
    return Promise.all([
      connect.get('item1'),
      connect.get('item2')
    ])
  })
  .then(([item1, item2]) => {
    t.deepEqual(item1.attributes.name, 'First item')
    t.deepEqual(item2.attributes.name, 'Second item')
  })
})

// Tests -- map item

test('should map item with map pipeline', (t) => {
  const source = createSource(mockdapter)
  source.items[0].map.push({
    from: (item) => {
      const attributes = Object.assign({}, item.attributes, {
        nameid: `${item.attributes.name} (${item.id})`
      })
      return Object.assign({}, item, {attributes})
    }
  })
  source.items[0].map.push((item) => {
    const attributes = Object.assign({}, item.attributes, {
      count: Object.keys(item.attributes).length
    })
    return Object.assign({}, item, {attributes})
  })

  return processSource(source)

  .then((items) => {
    t.is(items[0].attributes.nameid, 'First item (item1)')
    t.is(items[0].attributes.count, 2)
  })
})

// Tests -- filter items

test('should filter items', (t) => {
  const source = createSource(mockdapter)
  source.items[0].filter.push((item) => item.id === 'item2')

  return processSource(source)

  .then((items) => {
    t.is(items.length, 1)
    t.is(items[0].id, 'item2')
  })
})

test('should filter item through the filter pipeline', (t) => {
  const source = createSource(mockdapter)
  source.items[0].filter.push((item) => true)
  source.items[0].filter.push((item) => false)
  const expected = []

  return processSource(source)

  .then((items) => {
    t.deepEqual(items, expected)
  })
})
