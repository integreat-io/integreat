import test from 'ava'

import date from './date'

// Setup

const operands = {}

const theDate = new Date('2019-05-22T13:43:11.345Z')

// Tests

test('should transform values to date', t => {
  t.deepEqual(date(operands)(new Date('2019-05-22T13:43:11.345Z')), theDate)
  t.deepEqual(date(operands)('2019-05-22T15:43:11.345+02:00'), theDate)
  t.deepEqual(date(operands)(1558532591345), theDate)
})

test('should not touch null and undefined', t => {
  t.is(date(operands)(null), null)
  t.is(date(operands)(undefined), undefined)
})

test('should transform illegal values to undefined', t => {
  t.is(date(operands)('Not a date'), undefined)
  t.is(date(operands)({}), undefined)
  t.is(date(operands)({ id: '12345', title: 'Wrong' }), undefined)
  t.is(date(operands)(new Date('Not a date')), undefined)
  t.is(date(operands)(NaN), undefined)
  t.is(date(operands)(true), undefined)
  t.is(date(operands)(false), undefined)
})

test('should iterate arrays', t => {
  const value = [
    new Date('2019-05-22T13:43:11.345Z'),
    '2019-05-22T15:43:11.345+02:00',
    1558532591345,
    null,
    'A string',
    undefined,
    true,
    {}
  ]
  const expected = [
    theDate,
    theDate,
    theDate,
    null,
    undefined,
    undefined,
    undefined,
    undefined
  ]

  const ret = date(operands)(value)

  t.deepEqual(ret, expected)
})
