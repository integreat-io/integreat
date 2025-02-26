import test from 'node:test'
import assert from 'node:assert/strict'

import date from './date.js'

// Setup

const theDate = new Date('2019-05-22T13:43:11.345Z')

// Tests

test('should transform values to date', () => {
  assert.deepEqual(date(new Date('2019-05-22T13:43:11.345Z')), theDate)
  assert.deepEqual(date('2019-05-22T15:43:11.345+02:00'), theDate)
  assert.deepEqual(date(1558532591345), theDate)
})

test('should not touch null and undefined', () => {
  assert.equal(date(null), null)
  assert.equal(date(undefined), undefined)
})

test('should transform illegal values to undefined', () => {
  assert.equal(date('Not a date'), undefined)
  assert.equal(date({}), undefined)
  assert.equal(date({ id: '12345', title: 'Wrong' }), undefined)
  assert.equal(date(new Date('Not a date')), undefined)
  assert.equal(date(NaN), undefined)
  assert.equal(date(true), undefined)
  assert.equal(date(false), undefined)
})
