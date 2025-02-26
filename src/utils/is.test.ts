import test from 'node:test'
import assert from 'node:assert/strict'

import { isObject, isDate } from './is.js'

// Tests -- isObject

test('should return true for object', () => {
  const value = {}

  assert.equal(isObject(value), true)
})

test('should return false when not a object', () => {
  assert.equal(isObject('No date'), false)
  assert.equal(isObject(3), false)
  assert.equal(isObject(new Date()), false)
  assert.equal(isObject(true), false)
  assert.equal(isObject(null), false)
  assert.equal(isObject(undefined), false)
})

// Tests -- isDate

test('should return true when Date object', () => {
  const value = new Date('2021-05-03T18:43:11Z')

  assert.equal(isDate(value), true)
})

test('should return false when not a Date object', () => {
  assert.equal(isDate('No date'), false)
  assert.equal(isDate(3), false)
  assert.equal(isDate({}), false)
  assert.equal(isDate(true), false)
  assert.equal(isDate(null), false)
  assert.equal(isDate(undefined), false)
})
