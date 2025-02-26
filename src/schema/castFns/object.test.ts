import test from 'node:test'
import assert from 'node:assert/strict'

import object from './object.js'

// Tests

test('should return object untouched', () => {
  const value = { id: '15', title: 'Entry 15' }

  const ret = object(value)

  assert.equal(ret, value)
})

test('should return undefined for non-objects', () => {
  assert.equal(object('hello'), undefined)
  assert.equal(object(true), undefined)
  assert.equal(object(14), undefined)
  assert.equal(object(null), undefined)
  assert.equal(object(undefined), undefined)
})
