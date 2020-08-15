import test from 'ava'

import boolean from './boolean'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should transform values to boolean', (t) => {
  t.true(boolean(operands, options)(true, context))
  t.false(boolean(operands, options)(false, context))
  t.true(boolean(operands, options)('true', context))
  t.false(boolean(operands, options)('false', context))
  t.true(boolean(operands, options)(1, context))
  t.false(boolean(operands, options)(0, context))
})

test('should not touch null and undefined', (t) => {
  t.is(boolean(operands, options)(null, context), null)
  t.is(boolean(operands, options)(undefined, context), undefined)
})

test('should iteratre array', (t) => {
  const value = [true, false, 'true', 'false', 1, 0, undefined, null]
  const expected = [true, false, true, false, true, false, undefined, null]

  const ret = boolean(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
