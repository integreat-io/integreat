import test from 'ava'

import integer from './integer.js'

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

test('should transform values to integer', (t) => {
  t.is(integer(operands)(options)(12345, state), 12345)
  t.is(integer(operands)(options)(12.345, state), 12)
  t.is(integer(operands)(options)(12.899, state), 13)
  t.is(integer(operands)(options)('12345', state), 12345)
  t.is(integer(operands)(options)('12345.30', state), 12345)
  t.is(integer(operands)(options)('12345NUM', state), 12345)
  t.is(integer(operands)(options)('-35', state), -35)
  t.is(integer(operands)(options)(true, state), 1)
  t.is(integer(operands)(options)(false, state), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(
    integer(operands)(options)(new Date('2019-05-22T13:43:11.345Z'), state),
    1558532591345
  )
  t.is(
    integer(operands)(options)(
      new Date('2019-05-22T15:43:11.345+02:00'),
      state
    ),
    1558532591345
  )
})

test('should not touch null and undefined', (t) => {
  t.is(integer(operands)(options)(null, state), null)
  t.is(integer(operands)(options)(undefined, state), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(integer(operands)(options)('Not a number', state), undefined)
  t.is(integer(operands)(options)('NUM12345', state), undefined)
  t.is(integer(operands)(options)({}, state), undefined)
  t.is(
    integer(operands)(options)({ id: '12345', title: 'Wrong' }, state),
    undefined
  )
  t.is(integer(operands)(options)(new Date('Not a date'), state), undefined)
  t.is(integer(operands)(options)(NaN, state), undefined)
})

test('should iterate arrays', (t) => {
  const value = [
    12345.3,
    '12345',
    true,
    null,
    'A string',
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {},
  ]
  const expected = [
    12345,
    12345,
    1,
    null,
    undefined,
    undefined,
    1558532591345,
    undefined,
  ]

  const ret = integer(operands)(options)(value, state)

  t.deepEqual(ret, expected)
})
