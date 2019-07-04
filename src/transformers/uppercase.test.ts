import test from 'ava'

import uppercase from './uppercase'

// Tests -- from service

test('should return uppercase', (t) => {
  const value = 'julestjerne'
  const expected = 'JULESTJERNE'

  const ret = uppercase(value)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = uppercase(null)

  t.is(ret, null)
})

// Tests -- to service

test('should return uppercase to service', (t) => {
  const value = 'julestjerne'
  const expected = 'JULESTJERNE'

  const ret = uppercase.rev(value)

  t.is(ret, expected)
})

test('should return null when null to service', (t) => {
  const ret = uppercase.rev(null)

  t.is(ret, null)
})
