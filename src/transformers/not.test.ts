import test from 'ava'

import not from './not'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}

// Tests

test('should perform logical not', (t) => {
  t.false(not(operands, options)(true, context))
  t.true(not(operands, options)(false, context))
})

test('should treat value as truthy or falsy', (t) => {
  t.true(not(operands, options)(null, context))
  t.false(not(operands, options)('something', context))
})
