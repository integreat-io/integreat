import test from 'ava'

import Integreat, { authenticators } from './index.js'

// Tests

test('should have create', (t) => {
  t.is(typeof Integreat.create, 'function')
})

test('should have resource merger', (t) => {
  t.is(typeof Integreat.mergeResources, 'function')
})

test('should export resources', (t) => {
  t.truthy(authenticators)
  t.truthy(authenticators.token)
})
