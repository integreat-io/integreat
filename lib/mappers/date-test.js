import test from 'ava'

import date from './date'

test('should exist', (t) => {
  t.is(typeof date, 'function')
})

test('should parse date string', (t) => {
  const value = '2016-12-26 18:43:01'

  const ret = date(value)

  t.true(ret instanceof Date)
  t.is(ret.getTime(), 1482774181000)
})

test('should return null when no date string', (t) => {
  const ret = date()

  t.is(ret, null)
})

test('should return null when not a valid date', (t) => {
  const value = 'not a date'

  const ret = date(value)

  t.is(ret, null)
})
