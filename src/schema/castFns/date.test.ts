import test from 'ava'

import date from './date.js'

// Setup

const theDate = new Date('2019-05-22T13:43:11.345Z')

// Tests

test('should transform values to date', (t) => {
  t.deepEqual(date(new Date('2019-05-22T13:43:11.345Z')), theDate)
  t.deepEqual(date('2019-05-22T15:43:11.345+02:00'), theDate)
  t.deepEqual(date(1558532591345), theDate)
})

test('should not touch null and undefined', (t) => {
  t.is(date(null), null)
  t.is(date(undefined), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(date('Not a date'), undefined)
  t.is(date({}), undefined)
  t.is(date({ id: '12345', title: 'Wrong' }), undefined)
  t.is(date(new Date('Not a date')), undefined)
  t.is(date(NaN), undefined)
  t.is(date(true), undefined)
  t.is(date(false), undefined)
})
