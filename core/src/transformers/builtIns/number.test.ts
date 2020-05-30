import test from 'ava'

import number from './number'

// Setup

const operands = {}

// Tests

test('should transform values to number', t => {
  t.is(number(operands)(12345), 12345)
  t.is(number(operands)(12.345), 12.345)
  t.is(number(operands)(12.899), 12.899)
  t.is(number(operands)('12345'), 12345)
  t.is(number(operands)('12345.30'), 12345.3)
  t.is(number(operands)('12345.30NUM'), 12345.3)
  t.is(number(operands)('-35'), -35)
  t.is(number(operands)(true), 1)
  t.is(number(operands)(false), 0)
})

test('should transform dates to ms number', t => {
  t.is(number(operands)(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  t.is(
    number(operands)(new Date('2019-05-22T15:43:11.345+02:00')),
    1558532591345
  )
})

test('should not touch null and undefined', t => {
  t.is(number(operands)(null), null)
  t.is(number(operands)(undefined), undefined)
})

test('should transform illegal values to undefined', t => {
  t.is(number(operands)('Not a number'), undefined)
  t.is(number(operands)('NUM12345.30'), undefined)
  t.is(number(operands)({}), undefined)
  t.is(number(operands)({ id: '12345', title: 'Wrong' }), undefined)
  t.is(number(operands)(new Date('Not a date')), undefined)
  t.is(number(operands)(NaN), undefined)
})

test('should iterate arrays', t => {
  const value = [
    12345.3,
    '12345.30',
    true,
    null,
    'A string',
    undefined,
    new Date('2019-05-22T13:43:11.345Z'),
    {}
  ]
  const expected = [
    12345.3,
    12345.3,
    1,
    null,
    undefined,
    undefined,
    1558532591345,
    undefined
  ]

  const ret = number(operands)(value)

  t.deepEqual(ret, expected)
})
