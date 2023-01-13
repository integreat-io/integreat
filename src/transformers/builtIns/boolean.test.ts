import test from 'ava'

import boolean from './boolean.js'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  context: [],
  value: {},
}

// Tests

test('should transform values to boolean', (t) => {
  t.true(boolean(operands, options)(true, state))
  t.false(boolean(operands, options)(false, state))
  t.true(boolean(operands, options)('true', state))
  t.false(boolean(operands, options)('false', state))
  t.true(boolean(operands, options)(1, state))
  t.false(boolean(operands, options)(0, state))
})

test('should not touch null and undefined', (t) => {
  t.is(boolean(operands, options)(null, state), null)
  t.is(boolean(operands, options)(undefined, state), undefined)
})

test('should iteratre array', (t) => {
  const value = [true, false, 'true', 'false', 1, 0, undefined, null]
  const expected = [true, false, true, false, true, false, undefined, null]

  const ret = boolean(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
