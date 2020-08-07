import test from 'ava'

import number from './number'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should transform values to number', (t) => {
  t.is(number(operands, options)(12345, context), 12345)
  t.is(number(operands, options)(12.345, context), 12.345)
  t.is(number(operands, options)(12.899, context), 12.899)
  t.is(number(operands, options)('12345', context), 12345)
  t.is(number(operands, options)('12345.30', context), 12345.3)
  t.is(number(operands, options)('12345.30NUM', context), 12345.3)
  t.is(number(operands, options)('-35', context), -35)
  t.is(number(operands, options)(true, context), 1)
  t.is(number(operands, options)(false, context), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(
    number(operands, options)(new Date('2019-05-22T13:43:11.345Z'), context),
    1558532591345
  )
  t.is(
    number(operands, options)(
      new Date('2019-05-22T15:43:11.345+02:00'),
      context
    ),
    1558532591345
  )
})

test('should not touch null and undefined', (t) => {
  t.is(number(operands, options)(null, context), null)
  t.is(number(operands, options)(undefined, context), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(number(operands, options)('Not a number', context), undefined)
  t.is(number(operands, options)('NUM12345.30', context), undefined)
  t.is(number(operands, options)({}, context), undefined)
  t.is(
    number(operands, options)({ id: '12345', title: 'Wrong' }, context),
    undefined
  )
  t.is(number(operands, options)(new Date('Not a date'), context), undefined)
  t.is(number(operands, options)(NaN, context), undefined)
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

  const ret = number(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
