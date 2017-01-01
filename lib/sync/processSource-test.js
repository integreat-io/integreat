import test from 'ava'
import sinon from 'sinon'
import Storage from '../storage'

import processSource from './processSource'

// Helpers

const sourceDef = {
  sourcetype: 'entries',
  itemtype: 'entry',
  fetch: {endpoint: 'http://some.api/entries/'},
  item: {
    attributes: {
      id: {path: 'id'},
      name: {path: 'title'},
      createdAt: {path: 'createdAt'},
      updatedAt: {path: 'updatedAt'}
    }
  }
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
  const getAdapter = sinon.stub().returns(mockdapter)
  const expected = [
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}, createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}, createdAt: mockdate, updatedAt: mockdate}
  ]

  return processSource(sourceDef, getAdapter)

  .then((items) => {
    t.true(getAdapter.calledWith('entries'))
    t.deepEqual(items, expected)
  })
})

test('should store items', (t) => {
  const storage = new Storage({})
  const getAdapter = () => mockdapter
  const expected = [
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}, createdAt: mockdate, updatedAt: mockdate},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}, createdAt: mockdate, updatedAt: mockdate}
  ]

  return processSource(sourceDef, getAdapter, storage)

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
  const getAdapter = () => ({})

  return processSource(null, getAdapter)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No valid source definition')
  })
})

test('should reject when no adapter', (t) => {
  t.plan(2)

  return processSource({})

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No adapter function')
  })
})
