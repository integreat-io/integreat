import test from 'node:test'
import assert from 'node:assert/strict'

import number from './number.js'

// Tests

test('should transform values to number', () => {
  assert.equal(number(12345), 12345)
  assert.equal(number(12.345), 12.345)
  assert.equal(number(12.899), 12.899)
  assert.equal(number('12345'), 12345)
  assert.equal(number('12345.30'), 12345.3)
  assert.equal(number('12345.30NUM'), 12345.3)
  assert.equal(number('-35'), -35)
  assert.equal(number(true), 1)
  assert.equal(number(false), 0)
})

test('should transform dates to ms number', () => {
  assert.equal(number(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  assert.equal(number(new Date('2019-05-22T15:43:11.345+02:00')), 1558532591345)
})

test('should not touch null and undefined', () => {
  assert.equal(number(null), null)
  assert.equal(number(undefined), undefined)
})

test('should transform illegal values to undefined', () => {
  assert.equal(number('Not a number'), undefined)
  assert.equal(number('NUM12345.30'), undefined)
  assert.equal(number({}), undefined)
  assert.equal(number({ id: '12345', title: 'Wrong' }), undefined)
  assert.equal(number(new Date('Not a date')), undefined)
  assert.equal(number(NaN), undefined)
})
