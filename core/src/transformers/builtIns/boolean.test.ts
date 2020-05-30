import test from 'ava'

import boolean from './boolean'

// Setup

const operands = {}

// Tests

test('should transform values to boolean', t => {
  t.true(boolean(operands)(true))
  t.false(boolean(operands)(false))
  t.true(boolean(operands)('true'))
  t.false(boolean(operands)('false'))
  t.true(boolean(operands)(1))
  t.false(boolean(operands)(0))
})

test('should not touch null and undefined', t => {
  t.is(boolean(operands)(null), null)
  t.is(boolean(operands)(undefined), undefined)
})

test('should iteratre array', t => {
  const value = [
    true,
    false,
    'true',
    'false',
    1,
    0,
    undefined,
    null
  ]
  const expected = [
    true,
    false,
    true,
    false,
    true,
    false,
    undefined,
    null
  ]

  const ret = boolean(operands)(value)

  t.deepEqual(ret, expected)
})
