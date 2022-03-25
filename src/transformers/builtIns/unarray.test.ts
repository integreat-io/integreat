import test from 'ava'

import unarray from './unarray'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should extract value from array with one item', (t) => {
  const data = [3]
  const expected = 3

  const ret = unarray(operands, options)(data, context)

  t.is(ret, expected)
})

test('should return undefined when array has more than one item', (t) => {
  const data = [3, 5, 4]
  const expected = undefined

  const ret = unarray(operands, options)(data, context)

  t.is(ret, expected)
})

test('should return undefined when array has no items', (t) => {
  const data: unknown[] = []
  const expected = undefined

  const ret = unarray(operands, options)(data, context)

  t.is(ret, expected)
})

test('should return value when no array', (t) => {
  const data = 3
  const expected = 3

  const ret = unarray(operands, options)(data, context)

  t.is(ret, expected)
})
