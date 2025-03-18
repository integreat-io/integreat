import test from 'node:test'
import assert from 'node:assert/strict'

import Integreat, { authenticators } from './index.js'

// Tests

test('should have create', () => {
  assert.equal(typeof Integreat.create, 'function')
})

test('should have resource merger', () => {
  assert.equal(typeof Integreat.mergeResources, 'function')
})

test('should export resources', () => {
  assert.equal(!!authenticators, true)
  assert.equal(!!authenticators.token, true)
})
