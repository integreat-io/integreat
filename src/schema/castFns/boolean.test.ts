import test from 'ava'

import boolean from './boolean.js'

// Tests

test('should transform values to boolean', (t) => {
  t.true(boolean(true))
  t.false(boolean(false))
  t.true(boolean('true'))
  t.false(boolean('false'))
  t.true(boolean(1))
  t.false(boolean(0))
})

test('should not touch null and undefined', (t) => {
  t.is(boolean(null), null)
  t.is(boolean(undefined), undefined)
})
