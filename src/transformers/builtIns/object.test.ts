import test from 'ava'

import object from './object.js'

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

test('should return object untouched', (t) => {
  const value = { id: '15', title: 'Entry 15' }

  const ret = object(operands, options)(value, state)

  t.is(ret, value)
})

test('should return undefined for non-objects', (t) => {
  t.is(object(operands, options)('hello', state), undefined)
  t.is(object(operands, options)(true, state), undefined)
  t.is(object(operands, options)(14, state), undefined)
  t.is(object(operands, options)(null, state), undefined)
  t.is(object(operands, options)(undefined, state), undefined)
})

test('should iterate array', (t) => {
  const value = [
    'hello',
    true,
    { id: '15', title: 'Entry 15' },
    14,
    null,
    undefined,
  ]
  const expected = [
    undefined,
    undefined,
    { id: '15', title: 'Entry 15' },
    undefined,
    undefined,
    undefined,
  ]

  const ret = object(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
