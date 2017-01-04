import test from 'ava'
import Storage from '../storage'
import Source from '../source'
import Attribute from '../source/attribute'

import processSource from './processSource'

// Helpers

const createSource = (adapter) => {
  const source = new Source('entry')
  source.adapter = adapter || null
  source.fetch = {endpoint: 'http://some.api/entries/'}
  source.attributes = [
    new Attribute('id', null, 'id'),
    new Attribute('name', null, 'title'),
    new Attribute('createdAt', null, 'createdAt'),
    new Attribute('updatedAt', null, 'updatedAt')
  ]
  return source
}

const mockdate = Date.now()

const mockdapter = {
  retrieve: () => Promise.resolve([
    {id: 'item1', title: 'First item', createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', title: 'Second item', createdAt: mockdate, updatedAt: mockdate}
  ]),

  normalize: (item, path) => item
}

// Tests

test('should exist', (t) => {
  t.is(typeof processSource, 'function')
})

test('should retrieve, map, and return items', (t) => {
  const source = createSource(mockdapter)
  const expected = [
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}, createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}, createdAt: mockdate, updatedAt: mockdate}
  ]

  return processSource(source)

  .then((items) => {
    t.deepEqual(items, expected)
  })
})

test('should store items', (t) => {
  const source = createSource(mockdapter)
  const storage = new Storage({})
  const expected = [
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}, createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}, createdAt: mockdate, updatedAt: mockdate}
  ]

  return processSource(source, storage)

  .then((items) => {
    t.deepEqual(items, expected)
    return Promise.all([
      storage.fetchItem('item1', 'entry'),
      storage.fetchItem('item2', 'entry')
    ])
  })
  .then(([item1, item2]) => {
    t.deepEqual(item1, expected[0])
    t.deepEqual(item2, expected[1])
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

test('should reject when no adapter', (t) => {
  t.plan(2)
  const source = createSource()

  return processSource(source)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No adapter function')
  })
})
