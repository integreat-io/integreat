import test from 'ava'

import not from './not'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  root: {},
  context: {},
  value: {},
}

// Tests

test('should perform logical not', (t) => {
  t.false(not(operands, options)(true, state))
  t.true(not(operands, options)(false, state))
})

test('should treat value as truthy or falsy', (t) => {
  t.true(not(operands, options)(null, state))
  t.false(not(operands, options)('something', state))
})
