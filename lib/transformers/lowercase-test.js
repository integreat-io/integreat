import test from 'ava'

import lowercase from './lowercase'

// Tests -- from service

test('should return uppercase', (t) => {
  const value = 'JULESTJERNE'
  const expected = 'julestjerne'

  const ret = lowercase(value)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = lowercase(null)

  t.is(ret, null)
})

// Tests -- to service

test('should return uppercase to service', (t) => {
  const value = 'JULESTJERNE'
  const expected = 'julestjerne'

  const ret = lowercase.rev(value)

  t.is(ret, expected)
})

test('should return null when null to service', (t) => {
  const ret = lowercase.rev(null)

  t.is(ret, null)
})
