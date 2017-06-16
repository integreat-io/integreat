import test from 'ava'

import float from './float'

test('should exist', (t) => {
  t.is(typeof float, 'function')
})

test('should parse float', (t) => {
  const value = '1.5'

  const ret = float(value)

  t.is(ret, 1.5)
})

test('should return null when no value', (t) => {
  const ret = float()

  t.is(ret, null)
})

test('should return null when not a number', (t) => {
  const value = 'Not a number'

  const ret = float(value)

  t.is(ret, null)
})

test('should return null when string contains non-numeric chars', (t) => {
  const value = 'Number: 1.5'

  const ret = float(value)

  t.is(ret, null)
})

test('should trim spaces', (t) => {
  const value = ' 1.5 '

  const ret = float(value)

  t.is(ret, 1.5)
})

test('should parse integer in string to float', (t) => {
  const value = '1'

  const ret = float(value)

  t.is(ret, 1.0)
})

test('should parse integer to float', (t) => {
  const value = 1

  const ret = float(value)

  t.is(ret, 1)
})
