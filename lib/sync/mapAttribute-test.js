import test from 'ava'

import mapAttribute from './mapAttribute'

test('should exist', (t) => {
  t.is(typeof mapAttribute, 'function')
})

test('should return value if nothing else is given', (t) => {
  const ret = mapAttribute('value')

  t.is(ret, 'value')
})

test('should map value with one mapper', (t) => {
  const map = (value) => value.length

  const ret = mapAttribute('value', null, map)

  t.is(ret, 5)
})

test('should skip mapping if not a function', (t) => {
  const ret = mapAttribute('value', null, 'noFunction')

  t.is(ret, 'value')
})

test('should map with array of mappers', (t) => {
  const mappers = [
    (value) => value.length,
    {from: (value) => value + 1},
    (value) => 'Result: ' + value
  ]

  const ret = mapAttribute('value', null, mappers)

  t.is(ret, 'Result: 6')
})

test('should return default value if no value is given', (t) => {
  const ret = mapAttribute(null, 'default')

  t.is(ret, 'default')
})

test('should not return default value when value is given', (t) => {
  const ret = mapAttribute('value', 'default')

  t.is(ret, 'value')
})

test('should not treat empty string as no value', (t) => {
  const ret = mapAttribute('', 'default')

  t.is(ret, '')
})

test('should not map default value', (t) => {
  const fn = (value) => value + '.'

  const ret = mapAttribute(null, 'default', fn)

  t.is(ret, 'default')
})
