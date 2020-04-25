import test from 'ava'
import { Data, DataObject } from '../types'
import { Adapter } from '../service/types'

import mergeResources from './mergeResources'

// Setup

const mockAdapter = {} as Adapter
const mockTransformer = (_operators: DataObject) => (_value: Data): Data =>
  undefined
const unrealAdapter = {} as Adapter

const external1 = {
  adapters: { mockAdapter },
  transformers: { mockTransformer },
}

const external2 = {
  adapters: { unrealAdapter },
}

// Tests

test('should return empty object', (t) => {
  const ret = mergeResources()

  t.deepEqual(ret, {})
})

test('should return provided resource object', (t) => {
  const ret = mergeResources(external1)

  t.is(ret.adapters?.mockAdapter, mockAdapter)
  t.is(ret.transformers?.mockTransformer, mockTransformer)
})

test('should merge several resource objects', (t) => {
  const ret = mergeResources(external1, external2)

  t.is(ret.adapters?.mockAdapter, mockAdapter)
  t.is(ret.transformers?.mockTransformer, mockTransformer)
  t.is(ret.adapters?.unrealAdapter, unrealAdapter)
})
