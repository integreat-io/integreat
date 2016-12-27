import test from 'ava'

import integer from './integer'

test('should exist', (t) => {
  t.is(typeof integer, 'function')
})

test('should return integer', (t) => {
  const value = '3'

  const ret = integer(value)

  t.is(ret, 3)
})

test('should return null when no value', (t) => {
  const ret = integer()

  t.is(ret, null)
})

test('should not treat null as no value', (t) => {
  const value = 0

  const ret = integer(value)

  t.is(ret, 0)
})

test('should return null when string contains non-number chars', (t) => {
  const value = 'Number 3'

  const ret = integer(value)

  t.is(ret, null)
})

test('should trim space from value', (t) => {
  const value = ' 3 '

  const ret = integer(value)

  t.is(ret, 3)
})
