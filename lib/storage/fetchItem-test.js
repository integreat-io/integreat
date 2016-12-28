import test from 'ava'
import {couchdb as Dbdb} from 'dbdbmock'

import fetchItem from './fetchItem'

test('should exist', (t) => {
  t.is(typeof fetchItem, 'function')
})

test('should retrieve item from store', (t) => {
  const db = new Dbdb({})
  const item = {id: 'entry:item1', type: 'item', itemtype: 'entry'}
  const expected = {id: 'item1', type: 'entry'}
  db.data.set('entry:item1', item)

  return fetchItem(db, 'item1', 'entry')

  .then((ret) => {
    t.deepEqual(ret, expected)
  })
})

test('should return null when item is not found', (t) => {
  const db = new Dbdb({})

  return fetchItem(db, 'unknown', 'item')

  .then((ret) => {
    t.is(ret, null)
  })
})

test('should return null when no id is given', (t) => {
  const db = new Dbdb({})

  return fetchItem(db)

  .then((ret) => {
    t.is(ret, null)
  })
})

test('should return null when no type is given', (t) => {
  const db = new Dbdb({})

  return fetchItem(db, 'item1')

  .then((ret) => {
    t.is(ret, null)
  })
})

test('should reject on other error', (t) => {
  t.plan(1)
  const db = new Dbdb({})
  db.data.set('item:error', new Error('Major crisis!'))

  return fetchItem(db, 'error', 'item')

  .catch((err) => {
    t.true(err instanceof Error)
  })
})
