import test from 'ava'
import sinon from 'sinon'
import Storage from '../storage'

import processSource from './processSource'

// Helpers

const sourceDef = {
  sourcetype: 'entries',
  fetch: {endpoint: 'http://some.api/entries/'},
  item: {
    type: 'entry',
    attributes: {id: {path: 'id'}, name: {path: 'title'}}
  }
}

const mockdapter = {
  retrieve: () => Promise.resolve([
    {id: 'item1', title: 'First item'},
    {id: 'item2', title: 'Second item'}
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
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}}
  ]

  return processSource(getAdapter)(sourceDef)

  .then((items) => {
    t.deepEqual(items, expected)
    t.true(getAdapter.calledWith('entries'))
  })
})

test('should store items', (t) => {
  const storage = new Storage({})
  const getAdapter = () => mockdapter
  const expected = [
    {id: 'item1', type: 'entry', attributes: {name: 'First item'}},
    {id: 'item2', type: 'entry', attributes: {name: 'Second item'}}
  ]

  return processSource(getAdapter, storage)(sourceDef)

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

  return processSource(getAdapter)(null)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No valid source definition')
  })
})

test('should reject when no adapter', (t) => {
  t.plan(2)

  return processSource()({})

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'No adapter function')
  })
})
