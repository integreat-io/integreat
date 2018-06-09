import test from 'ava'

import trans from './removeTypePrefixOnId'

test('should be a two-way tranformer', (t) => {
  t.is(typeof trans.from, 'function')
  t.is(typeof trans.to, 'function')
})

test('should remove type going from service', (t) => {
  const item = {id: 'entry:ent1', type: 'entry'}
  const expected = {id: 'ent1', type: 'entry'}

  const ret = trans.from(item)

  t.deepEqual(ret, expected)
})

test('should not touch unprefixed id going from service', (t) => {
  const item = {id: 'ent1', type: 'entry'}

  const ret = trans.from(item)

  t.deepEqual(ret, item)
})

test('should add type going to service', (t) => {
  const item = {id: 'ent1', type: 'entry'}
  const expected = {id: 'entry:ent1', type: 'entry'}

  const ret = trans.to(item)

  t.deepEqual(ret, expected)
})

test('should not touch prefixed id going to service', (t) => {
  const item = {id: 'entry:ent1', type: 'entry'}

  const ret = trans.to(item)

  t.deepEqual(ret, item)
})
