import test from 'ava'

import uppercase from './uppercase'

// Setup

const operands = {}

// Tests

test('should return uppercase)', (t) => {
  const value = 'julestjerne'
  const expected = 'JULESTJERNE'

  const ret = uppercase(operands)(value)

  t.is(ret, expected)
})

test('should return null when null', (t) => {
  const ret = uppercase(operands)(null)

  t.is(ret, null)
})

test('should iterate array)', (t) => {
  const value = ['julestjerne', 'påskelilje', undefined]
  const expected = ['JULESTJERNE', 'PÅSKELILJE', undefined]

  const ret = uppercase(operands)(value)

  t.deepEqual(ret, expected)
})
