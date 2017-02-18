import test from 'ava'
import {couchdb as Dbdb} from 'dbdbmock'

import Connector from '.'

test('should exist', (t) => {
  t.is(typeof Connector, 'function')
})

test('set should exist', (t) => {
  const connect = new Connector()

  t.is(typeof connect.set, 'function')
})

test('set should set item', (t) => {
  const entry = {id: 'ent1', type: 'entry'}
  const db = new Dbdb()
  const connect = new Connector(db, 'entry')

  return connect.set(entry)

  .then((ret) => {
    t.truthy(db.data.get('entry:ent1'))
  })
})

test('get should exist', (t) => {
  const connect = new Connector()

  t.is(typeof connect.get, 'function')
})

test('get should get item', (t) => {
  const entry = {id: 'ent1', type: 'entry'}
  const db = new Dbdb()
  const connect = new Connector(db, 'entry')
  return connect.set(entry)

  .then(() => connect.get('ent1'))

  .then((ret) => {
    t.truthy(ret)
    t.is(ret.id, 'ent1')
  })
})

test('all should exist', (t) => {
  const connect = new Connector()

  t.is(typeof connect.all, 'function')
})

test('all should return all items of the type', (t) => {
  const items = [
    {id: 'item:item1', type: 'item', itemtype: 'item', _key: 'item'},
    {id: 'entry:item2', type: 'item', itemtype: 'entry', _key: 'entry'}
  ]
  const db = new Dbdb()
  db.data.set('view:items:by_type', items)
  const connect = new Connector(db, 'entry')

  return connect.all()

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 1)
    t.is(ret[0].id, 'item2')
  })
})
