import test from 'ava'

import object from './object.js'

// Tests

test('should return object untouched', (t) => {
  const value = { id: '15', title: 'Entry 15' }

  const ret = object(value)

  t.is(ret, value)
})

test('should return undefined for non-objects', (t) => {
  t.is(object('hello'), undefined)
  t.is(object(true), undefined)
  t.is(object(14), undefined)
  t.is(object(null), undefined)
  t.is(object(undefined), undefined)
})
