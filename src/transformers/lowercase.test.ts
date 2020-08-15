import test from 'ava'

import lowercase from './lowercase'

// Setup

const operands = {}
const options = {}
const context = {
  rev: false,
  onlyMappedValues: false,
}

// Tests

test('should return uppercase', (t) => {
  const value = 'JULESTJERNE'
  const expected = 'julestjerne'

  const ret = lowercase(operands, options)(value, context)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = lowercase(operands, options)(null, context)

  t.is(ret, null)
})

test('should iterate array', (t) => {
  const value = ['JULESTJERNE', 'PÅSKELILJE', undefined]
  const expected = ['julestjerne', 'påskelilje', undefined]

  const ret = lowercase(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
