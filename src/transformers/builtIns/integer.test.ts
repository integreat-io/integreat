import test from 'ava'

import integer from './integer'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

// Tests

test('should transform values to integer', (t) => {
  t.is(integer(operands, options)(12345, context), 12345)
  t.is(integer(operands, options)(12.345, context), 12)
  t.is(integer(operands, options)(12.899, context), 13)
  t.is(integer(operands, options)('12345', context), 12345)
  t.is(integer(operands, options)('12345.30', context), 12345)
  t.is(integer(operands, options)('12345NUM', context), 12345)
  t.is(integer(operands, options)('-35', context), -35)
  t.is(integer(operands, options)(true, context), 1)
  t.is(integer(operands, options)(false, context), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(
    integer(operands, options)(new Date('2019-05-22T13:43:11.345Z'), context),
    1558532591345
  )
  t.is(
    integer(operands, options)(
      new Date('2019-05-22T15:43:11.345+02:00'),
      context
    ),
    1558532591345
  )
})

test('should not touch null and undefined', (t) => {
  t.is(integer(operands, options)(null, context), null)
  t.is(integer(operands, options)(undefined, context), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(integer(operands, options)('Not a number', context), undefined)
  t.is(integer(operands, options)('NUM12345', context), undefined)
  t.is(integer(operands, options)({}, context), undefined)
  t.is(
    integer(operands, options)({ id: '12345', title: 'Wrong' }, context),
    undefined
  )
  t.is(integer(operands, options)(new Date('Not a date'), context), undefined)
  t.is(integer(operands, options)(NaN, context), undefined)
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

  const ret = integer(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
