import test from 'ava'

import date from './date'

// Setup

const operands = {}
const options = {}
const context = { rev: false, onlyMappedValues: false }

const theDate = new Date('2019-05-22T13:43:11.345Z')

// Tests

test('should transform values to date', (t) => {
  t.deepEqual(
    date(operands, options)(new Date('2019-05-22T13:43:11.345Z'), context),
    theDate
  )
  t.deepEqual(
    date(operands, options)('2019-05-22T15:43:11.345+02:00', context),
    theDate
  )
  t.deepEqual(date(operands, options)(1558532591345, context), theDate)
})

test('should not touch null and undefined', (t) => {
  t.is(date(operands, options)(null, context), null)
  t.is(date(operands, options)(undefined, context), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(date(operands, options)('Not a date', context), undefined)
  t.is(date(operands, options)({}, context), undefined)
  t.is(
    date(operands, options)({ id: '12345', title: 'Wrong' }, context),
    undefined
  )
  t.is(date(operands, options)(new Date('Not a date'), context), undefined)
  t.is(date(operands, options)(NaN, context), undefined)
  t.is(date(operands, options)(true, context), undefined)
  t.is(date(operands, options)(false, context), undefined)
})

test('should iterate arrays', (t) => {
  const value = [
    new Date('2019-05-22T13:43:11.345Z'),
    '2019-05-22T15:43:11.345+02:00',
    1558532591345,
    null,
    'A string',
    undefined,
    true,
    {},
  ]
  const expected = [
    theDate,
    theDate,
    theDate,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
  ]

  const ret = date(operands, options)(value, context)

  t.deepEqual(ret, expected)
})
