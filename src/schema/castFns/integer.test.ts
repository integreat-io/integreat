import test from 'node:test'
import assert from 'node:assert/strict'

import integer from './integer.js'

// Tests

test('should transform values to integer', () => {
  assert.equal(integer(12345), 12345)
  assert.equal(integer(12.345), 12)
  assert.equal(integer(12.899), 13)
  assert.equal(integer('12345'), 12345)
  assert.equal(integer('12345.30'), 12345)
  assert.equal(integer('12345NUM'), 12345)
  assert.equal(integer('-35'), -35)
  assert.equal(integer(true), 1)
  assert.equal(integer(false), 0)
})

test('should transform dates to ms number', () => {
  assert.equal(integer(new Date('2019-05-22T13:43:11.345Z')), 1558532591345)
  assert.equal(
    integer(new Date('2019-05-22T15:43:11.345+02:00')),
    1558532591345,
  )
})

test('should not touch null and undefined', () => {
  assert.equal(integer(null), null)
  assert.equal(integer(undefined), undefined)
})

test('should transform illegal values to undefined', () => {
  assert.equal(integer('Not a number'), undefined)
  assert.equal(integer('NUM12345'), undefined)
  assert.equal(integer({}), undefined)
  assert.equal(integer({ id: '12345', title: 'Wrong' }), undefined)
  assert.equal(integer(new Date('Not a date')), undefined)
  assert.equal(integer(NaN), undefined)
})
