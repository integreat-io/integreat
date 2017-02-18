import test from 'ava'
import {couchdb as Dbdb} from 'dbdbmock'

import set from './set'

test('should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should set item', (t) => {
  const db = new Dbdb({})
  const item = {id: 'item1', type: 'entry', attributes: {title: 'Item 1'}}
  const expected = {id: 'entry:item1', type: 'item', itemtype: 'entry', attributes: {title: 'Item 1'}}

  return set(db, item)

  .then(() => {
    t.deepEqual(db.data.get('entry:item1'), expected)
  })
})

test('should update existing item', (t) => {
  const db = new Dbdb({})
  const item = {id: 'item1', type: 'entry', attributes: {title: 'Item 1'}, createdAt: '2016-12-26', updatedAt: '2016-12-26'}
  const updated = {id: 'item1', type: 'entry', attributes: {title: 'Item 2'}, createdAt: '2016-12-27', updatedAt: '2016-12-27'}
  db.data.set('entry:item1', item)

  return set(db, updated)

  .then((ret) => {
    t.truthy(ret)
    t.is(ret.id, 'item1')
    t.is(ret.type, 'entry')
    t.is(ret.attributes.title, 'Item 2')
    t.is(ret.createdAt, '2016-12-26')
    t.is(ret.updatedAt, '2016-12-27')
  })
})

test('should resolve with null when no item is given', (t) => {
  const db = new Dbdb({})

  return set(db)

  .then((ret) => {
    t.is(ret, null)
  })
})

test('should reject on error other than not found', (t) => {
  t.plan(2)
  const db = new Dbdb({})
  const item = {id: 'error', type: 'item'}
  db.data.set('item:error', new Error('Awful things'))

  return set(db, item)

  .catch((err) => {
    t.true(err instanceof Error)
    t.is(err.message, 'Awful things')
  })
})
