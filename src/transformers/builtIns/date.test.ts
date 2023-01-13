import test from 'ava'

import date from './date.js'

// Setup

const operands = {}
const options = {}
const state = {
  rev: false,
  onlyMappedValues: false,
  context: [],
  value: {},
}

const theDate = new Date('2019-05-22T13:43:11.345Z')

// Tests

test('should transform values to date', (t) => {
  t.deepEqual(
    date(operands, options)(new Date('2019-05-22T13:43:11.345Z'), state),
    theDate
  )
  t.deepEqual(
    date(operands, options)('2019-05-22T15:43:11.345+02:00', state),
    theDate
  )
  t.deepEqual(date(operands, options)(1558532591345, state), theDate)
})

test('should not touch null and undefined', (t) => {
  t.is(date(operands, options)(null, state), null)
  t.is(date(operands, options)(undefined, state), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(date(operands, options)('Not a date', state), undefined)
  t.is(date(operands, options)({}, state), undefined)
  t.is(
    date(operands, options)({ id: '12345', title: 'Wrong' }, state),
    undefined
  )
  t.is(date(operands, options)(new Date('Not a date'), state), undefined)
  t.is(date(operands, options)(NaN, state), undefined)
  t.is(date(operands, options)(true, state), undefined)
  t.is(date(operands, options)(false, state), undefined)
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

  const ret = date(operands, options)(value, state)

  t.deepEqual(ret, expected)
})
