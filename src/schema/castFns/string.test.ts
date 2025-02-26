import test from 'node:test'
import assert from 'node:assert/strict'

import stringFn from './string.js'

// Tests

test('should transform values to string', () => {
  assert.equal(stringFn('A string'), 'A string')
  assert.equal(stringFn(12345), '12345')
  assert.equal(stringFn(12.345), '12.345')
  assert.equal(stringFn(true), 'true')
  assert.equal(stringFn(false), 'false')
})

test('should transform dates to iso string', () => {
  assert.equal(
    stringFn(new Date('2019-05-22T13:43:11.345Z')),
    '2019-05-22T13:43:11.345Z',
  )
  assert.equal(
    stringFn(new Date('2019-05-22T15:43:11.345+02:00')),
    '2019-05-22T13:43:11.345Z',
  )
})

test('should transform objects to undefined', () => {
  assert.equal(stringFn({}), undefined)
  assert.equal(stringFn({ id: '12345', title: 'Wrong' }), undefined)
})

test('should not touch null and undefined', () => {
  assert.equal(stringFn(null), null)
  assert.equal(stringFn(undefined), undefined)
})
