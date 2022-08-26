import test from 'ava'

import lowercase from './lowercase'

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

test('should return uppercase', (t) => {
  const value = 'JULESTJERNE'
  const expected = 'julestjerne'

  const ret = lowercase(operands, options)(value, state)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = lowercase(operands, options)(null, state)

  t.is(ret, null)
})

test('should iterate array', (t) => {
  const value = ['JULESTJERNE', 'PÅSKELILJE', undefined]
  const expected = ['julestjerne', 'påskelilje', undefined]

  const ret = lowercase(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
