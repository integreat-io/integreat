import test from 'ava'

import integer from './integer'

// Setup

const operands = {}

// Tests

test('should transform values to integer', t => {
  t.is(integer(operands)(12345), 12345)
  t.is(integer(operands)(12.345), 12)
  t.is(integer(operands)(12.899), 13)
  t.is(integer(operands)('12345'), 12345)
  t.is(integer(operands)('12345.30'), 12345)
  t.is(integer(operands)('12345NUM'), 12345)
  t.is(integer(operands)('-35'), -35)
  t.is(integer(operands)(true), 1)
  t.is(integer(operands)(false), 0)
})

test('should transform dates to ms number', t => {
  t.is(integer(operands)(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  t.is(
    integer(operands)(new Date('2019-05-22T15:43:11.345+02:00')),
    1558532591345
  )
})

test('should not touch null and undefined', t => {
  t.is(integer(operands)(null), null)
  t.is(integer(operands)(undefined), undefined)
})

test('should transform illegal values to undefined', t => {
  t.is(integer(operands)('Not a number'), undefined)
  t.is(integer(operands)('NUM12345'), undefined)
  t.is(integer(operands)({}), undefined)
  t.is(integer(operands)({ id: '12345', title: 'Wrong' }), undefined)
  t.is(integer(operands)(new Date('Not a date')), undefined)
  t.is(integer(operands)(NaN), undefined)
})

test('should iterate arrays', t => {
  const value = [
    12345.3,
    '12345',
    true,
    null,
    'A string',
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {}
  ]
  const expected = [
    12345,
    12345,
    1,
    null,
    undefined,
    undefined,
    1558532591345,
    undefined
  ]

  const ret = integer(operands)(value)

  t.deepEqual(ret, expected)
})
