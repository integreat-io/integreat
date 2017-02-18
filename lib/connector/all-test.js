import test from 'ava'
import {couchdb as Dbdb} from 'dbdbmock'

import all from './all'

test('should exist', (t) => {
  t.is(typeof all, 'function')
})

test('should fetch items of type', (t) => {
  const db = new Dbdb({})
  const items = [
    {id: 'entry:item1', type: 'item', itemtype: 'entry', _key: 'entry'},
    {id: 'item:item2', type: 'item', itemtype: 'item', _key: 'item'},
    {id: 'entry:item3', type: 'item', itemtype: 'entry', _key: 'entry'}
  ]
  db.data.set('view:items:by_type', items)

  return all(db, 'entry')

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 2)
    t.is(ret[0].id, 'item1')
    t.is(ret[0].type, 'entry')
    t.is(ret[1].id, 'item3')
    t.is(ret[1].type, 'entry')
  })
})

test('should return empty array when none is found', (t) => {
  const db = new Dbdb({})

  return all(db, 'entry')

  .then((ret) => {
    t.deepEqual(ret, [])
  })
})

test('should return empty array when no type is given', (t) => {
  const db = new Dbdb({})

  return all(db)

  .then((ret) => {
    t.deepEqual(ret, [])
  })
})

test('should reject on error', (t) => {
  t.plan(2)
  const db = new Dbdb({})
  db.data.set('view:items:by_type', new Error('Terrible events'))

  return all(db, 'entry')

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'Terrible events')
  })
})
