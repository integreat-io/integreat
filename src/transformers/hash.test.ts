import test from 'ava'

import hash from './hash'

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

test('should return hashed string', (t) => {
  const unhashed = 'https://test.com/a/long/path?with=queries'
  const expected = '9prI09j7pPp9qkyZAO1EwN7kWT2r-g_dCI7HeD_Tdgw~'

  const ret = hash(operands, options)(unhashed, state)

  t.is(ret, expected)
})

test('should return null when given null', (t) => {
  const ret = hash(operands, options)(null, state)

  t.is(ret, null)
})

test('should return undefined when given null', (t) => {
  const ret = hash(operands, options)(undefined, state)

  t.is(ret, undefined)
})

test('should return empty string when given empty string', (t) => {
  const ret = hash(operands, options)('', state)

  t.is(ret, '')
})

test('should treat number as a string', (t) => {
  const unhashed = 42
  const expected = 'c0dctApWjo2ooEXO0RATfhWfiQrE2og7axfcZRs6gEk~'

  const ret = hash(operands, options)(unhashed, state)

  t.is(ret, expected)
})
