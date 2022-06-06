import test from 'ava'

import number from './number'

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

test('should transform values to number', (t) => {
  t.is(number(operands, options)(12345, state), 12345)
  t.is(number(operands, options)(12.345, state), 12.345)
  t.is(number(operands, options)(12.899, state), 12.899)
  t.is(number(operands, options)('12345', state), 12345)
  t.is(number(operands, options)('12345.30', state), 12345.3)
  t.is(number(operands, options)('12345.30NUM', state), 12345.3)
  t.is(number(operands, options)('-35', state), -35)
  t.is(number(operands, options)(true, state), 1)
  t.is(number(operands, options)(false, state), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(
    number(operands, options)(new Date('2019-05-22T13:43:11.345Z'), state),
    1558532591345
  )
  t.is(
    number(operands, options)(new Date('2019-05-22T15:43:11.345+02:00'), state),
    1558532591345
  )
})

test('should not touch null and undefined', (t) => {
  t.is(number(operands, options)(null, state), null)
  t.is(number(operands, options)(undefined, state), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(number(operands, options)('Not a number', state), undefined)
  t.is(number(operands, options)('NUM12345.30', state), undefined)
  t.is(number(operands, options)({}, state), undefined)
  t.is(
    number(operands, options)({ id: '12345', title: 'Wrong' }, state),
    undefined
  )
  t.is(number(operands, options)(new Date('Not a date'), state), undefined)
  t.is(number(operands, options)(NaN, state), undefined)
})

test('should iterate arrays', (t) => {
  const value = [
    12345.3,
    '12345.30',
    true,
    null,
    'A string',
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {},
  ]
  const expected = [
    12345.3,
    12345.3,
    1,
    null,
    undefined,
    undefined,
    1558532591345,
    undefined,
  ]

  const ret = number(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
