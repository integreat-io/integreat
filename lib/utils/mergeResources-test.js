import test from 'ava'

import mergeResources from './mergeResources'

// Setup

const mockAdapter = {}
const mockMutator = {}
const unrealAdapter = {}

const external1 = {
  adapters: { mockAdapter },
  mutators: { mockMutator }
}

const external2 = {
  adapters: { unrealAdapter }
}

// Tests

test('should return empty object', (t) => {
  const ret = mergeResources()

  t.deepEqual(ret, {})
})

test('should return provided resource object', (t) => {
  const ret = mergeResources(external1)

  t.is(ret.adapters.mockAdapter, mockAdapter)
  t.is(ret.mutators.mockMutator, mockMutator)
})

test('should merge several resource objects', (t) => {
  const ret = mergeResources(external1, external2)

  t.is(ret.adapters.mockAdapter, mockAdapter)
  t.is(ret.mutators.mockMutator, mockMutator)
  t.is(ret.adapters.unrealAdapter, unrealAdapter)
})
