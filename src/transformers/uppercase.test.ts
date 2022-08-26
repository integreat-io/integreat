import test from 'ava'

import uppercase from './uppercase'

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

test('should return uppercase)', (t) => {
  const value = 'julestjerne'
  const expected = 'JULESTJERNE'

  const ret = uppercase(operands, options)(value, state)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = uppercase(operands, options)(null, state)

  t.is(ret, null)
})

test('should iterate array', (t) => {
  const value = ['julestjerne', 'påskelilje', undefined]
  const expected = ['JULESTJERNE', 'PÅSKELILJE', undefined]

  const ret = uppercase(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
