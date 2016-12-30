import test from 'ava'

import {toDb, fromDb} from './db'

// Tests -- toDb

test('toDb should exist', (t) => {
  t.is(typeof toDb, 'function')
})

test('toDb should return db version of item', (t) => {
  const item = {id: 'item1', type: 'entry'}
  const expected = {id: 'entry:item1', type: 'item', itemtype: 'entry'}

  const ret = toDb(item)

  t.deepEqual(ret, expected)
})

test('toDb should return db version of array of items', (t) => {
  const items = [
    {id: 'item1', type: 'entry'},
    {id: 'item2', type: 'entry'}
  ]
  const expected = [
    {id: 'entry:item1', type: 'item', itemtype: 'entry'},
    {id: 'entry:item2', type: 'item', itemtype: 'entry'}
  ]

  const ret = toDb(items)

  t.deepEqual(ret, expected)
})

test('toDb should return null when no item is given', (t) => {
  const ret = toDb()

  t.is(ret, null)
})

// Tests -- fromDb

test('fromDb should exist', (t) => {
  t.is(typeof fromDb, 'function')
})

test('fromDb should return not-db version of item', (t) => {
  const item = {id: 'entry:item1', type: 'item', itemtype: 'entry'}
  const expected = {id: 'item1', type: 'entry'}

  const ret = fromDb(item)

  t.deepEqual(ret, expected)
})

test('fromDb should return not-db version of several items', (t) => {
  const items = [
    {id: 'entry:item1', type: 'item', itemtype: 'entry'},
    {id: 'entry:item2', type: 'item', itemtype: 'entry'}
  ]
  const expected = [
    {id: 'item1', type: 'entry'},
    {id: 'item2', type: 'entry'}
  ]

  const ret = fromDb(items)

  t.deepEqual(ret, expected)
})

test('fromDb should return null when no item is given', (t) => {
  const ret = fromDb()

  t.is(ret, null)
})
