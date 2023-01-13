import test from 'ava'

import { isObject, isDate } from './is.js'

// Tests -- isObject

test('should return true for object', (t) => {
  const value = {}

  t.true(isObject(value))
})

test('should return false when not a object', (t) => {
  t.false(isObject('No date'))
  t.false(isObject(3))
  t.false(isObject(new Date()))
  t.false(isObject(true))
  t.false(isObject(null))
  t.false(isObject(undefined))
})

// Tests -- isDate

test('should return true when Date object', (t) => {
  const value = new Date('2021-05-03T18:43:11Z')

  t.true(isDate(value))
})

test('should return false when not a Date object', (t) => {
  t.false(isDate('No date'))
  t.false(isDate(3))
  t.false(isDate({}))
  t.false(isDate(true))
  t.false(isDate(null))
  t.false(isDate(undefined))
})
