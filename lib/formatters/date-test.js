import test from 'ava'

import date from './date'

// Tests

test('should be a two-way formatter', (t) => {
  t.is(typeof date.from, 'function')
  t.is(typeof date.to, 'function')
})

// Tests -- from

test('should parse date string', (t) => {
  const value = '2016-12-26T18:43:01Z'

  const ret = date.from(value)

  t.true(ret instanceof Date)
  t.is(ret.getTime(), 1482777781000)
})

test('should return null when no date string', (t) => {
  const ret = date.from()

  t.is(ret, null)
})

test('should return null when not a valid date', (t) => {
  const value = 'not a date'

  const ret = date.from(value)

  t.is(ret, null)
})

// Tests -- to

test('should generate a timestamp', (t) => {
  const value = new Date('2017-08-19T19:28:51.810Z')

  const ret = date.to(value)

  t.is(ret, 1503170931810)
})

test('should return null as timestamp value is null', (t) => {
  const value = null

  const ret = date.to(value)

  t.is(ret, null)
})

test('should return null when not a valid date', (t) => {
  const value = 'not a date'

  const ret = date.to(value)

  t.is(ret, null)
})
