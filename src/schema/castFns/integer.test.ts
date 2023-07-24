import test from 'ava'

import integer from './integer.js'

// Tests

test('should transform values to integer', (t) => {
  t.is(integer(12345), 12345)
  t.is(integer(12.345), 12)
  t.is(integer(12.899), 13)
  t.is(integer('12345'), 12345)
  t.is(integer('12345.30'), 12345)
  t.is(integer('12345NUM'), 12345)
  t.is(integer('-35'), -35)
  t.is(integer(true), 1)
  t.is(integer(false), 0)
})

test('should transform dates to ms number', (t) => {
  t.is(integer(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  t.is(integer(new Date('2019-05-22T15:43:11.345+02:00')), 1558532591345)
})

test('should not touch null and undefined', (t) => {
  t.is(integer(null), null)
  t.is(integer(undefined), undefined)
})

test('should transform illegal values to undefined', (t) => {
  t.is(integer('Not a number'), undefined)
  t.is(integer('NUM12345'), undefined)
  t.is(integer({}), undefined)
  t.is(integer({ id: '12345', title: 'Wrong' }), undefined)
  t.is(integer(new Date('Not a date')), undefined)
  t.is(integer(NaN), undefined)
})
