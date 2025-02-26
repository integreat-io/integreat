import test from 'node:test'
import assert from 'node:assert/strict'

import boolean from './boolean.js'

// Tests

test('should transform values to boolean', () => {
  assert.equal(boolean(true), true)
  assert.equal(boolean(false), false)
  assert.equal(boolean('true'), true)
  assert.equal(boolean('false'), false)
  assert.equal(boolean(1), true)
  assert.equal(boolean(0), false)
})

test('should not touch null and undefined', () => {
  assert.equal(boolean(null), null)
  assert.equal(boolean(undefined), undefined)
})
