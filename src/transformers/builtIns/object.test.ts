import test from 'ava'

import object from './object'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should return object untouched', (t) => {
  const value = { id: '15', title: 'Entry 15' }

  const ret = object(operands, options)(value, context)

  t.is(ret, value)
})

test('should return undefined for non-objects', (t) => {
  t.is(object(operands, options)('hello', context), undefined)
  t.is(object(operands, options)(true, context), undefined)
  t.is(object(operands, options)(14, context), undefined)
  t.is(object(operands, options)(null, context), undefined)
  t.is(object(operands, options)(undefined, context), undefined)
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

  const ret = object(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
