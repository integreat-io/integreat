import test from 'ava'

import Storage from './index'

test('should exist', (t) => {
  t.is(typeof Storage, 'function')
})

test('should set db', (t) => {
  const config = {url: 'http://test.base/db'}

  const st = new Storage(config)

  t.is(st._db.constructor.name, 'DbdbCouch')
  t.deepEqual(st._db.config, config)
})

test('storeItem should exist', (t) => {
  const st = new Storage()

  t.is(typeof st.storeItem, 'function')
})

test('storeItem should store item', (t) => {
  const item = {id: 'item1', type: 'entry'}
  const st = new Storage({})

  return st.storeItem(item)

  .then(() => {
    t.truthy(st._db.data.get('entry:item1'))
  })
})

test('storeItems should exist', (t) => {
  const st = new Storage()

  t.is(typeof st.storeItems, 'function')
})

test('storeItems should store items', (t) => {
  const items = [
    {id: 'item1', type: 'entry'},
    {id: 'item2', type: 'entry'}
  ]
  const st = new Storage({})

  return st.storeItems(items)

  .then(() => {
    t.truthy(st._db.data.get('entry:item1'))
    t.truthy(st._db.data.get('entry:item2'))
  })
})

test('fetchItem should exist', (t) => {
  const st = new Storage()

  t.is(typeof st.fetchItem, 'function')
})

test('fetchItem should fetch item', (t) => {
  const item = {id: 'entry:item1', type: 'item', itemtype: 'entry'}
  const expected = {id: 'item1', type: 'entry'}
  const st = new Storage({})
  st._db.data.set('entry:item1', item)

  return st.fetchItem('item1', 'entry')

  .then((ret) => {
    t.deepEqual(ret, expected)
  })
})

test('fetchByType should exist', (t) => {
  const st = new Storage()

  t.is(typeof st.fetchByType, 'function')
})

test('fetchByType should fetch by type', (t) => {
  const items = [
    {id: 'item:item1', type: 'item', itemtype: 'item', _key: 'item'},
    {id: 'entry:item2', type: 'item', itemtype: 'entry', _key: 'entry'}
  ]
  const st = new Storage({})
  st._db.data.set('view:items:by_type', items)

  return st.fetchByType('entry')

  .then((ret) => {
    t.true(Array.isArray(ret))
    t.is(ret.length, 1)
    t.is(ret[0].id, 'item2')
  })
})

test('fetchSourceDefs should exist', (t) => {
  const st = new Storage()

  t.is(typeof st.fetchSourceDefs, 'function')
})
