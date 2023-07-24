import test from 'ava'

import number from './number.js'

// Tests

test('should transform values to number', (t) => {
  t.is(number(12345), 12345)
  t.is(number(12.345), 12.345)
  t.is(number(12.899), 12.899)
  t.is(number('12345'), 12345)
  t.is(number('12345.30'), 12345.3)
  t.is(number('12345.30NUM'), 12345.3)
  t.is(number('-35'), -35)
  t.is(number(true), 1)
  t.is(number(false), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(number(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  t.is(number(new Date('2019-05-22T15:43:11.345+02:00')), 1558532591345)
})

test('should not touch null and undefined', (t) => {
  t.is(number(null), null)
  t.is(number(undefined), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(number('Not a number'), undefined)
  t.is(number('NUM12345.30'), undefined)
  t.is(number({}), undefined)
  t.is(number({ id: '12345', title: 'Wrong' }), undefined)
  t.is(number(new Date('Not a date')), undefined)
  t.is(number(NaN), undefined)
})
