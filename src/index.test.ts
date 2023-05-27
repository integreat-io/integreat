import test from 'ava'

import Integreat, {
  authenticators,
  mutations,
  transformers,
  adapters,
} from './index.js'

// Tests

test('should have version and create', (t) => {
  t.is(typeof Integreat.version, 'string')
  t.is(typeof Integreat.create, 'function')
})

test('should have resource merger', (t) => {
  t.is(typeof Integreat.mergeResources, 'function')
})

test('should export resources', (t) => {
  t.truthy(authenticators)
  t.truthy(authenticators.token)
  t.truthy(mutations)
  t.truthy(mutations['exchange:json'])
  t.truthy(transformers)
  t.truthy(transformers.json)
  t.truthy(adapters)
  t.truthy(adapters.uri)
})
