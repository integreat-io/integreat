import test from 'ava'
import { Data, DataObject, Transporter } from '../types'

import mergeResources from './mergeResources'

// Setup

const mockTransporter = {} as Transporter
const mockTransformer = (_operators: DataObject) => (_value: Data): Data =>
  undefined
const unrealTransporter = {} as Transporter

const external1 = {
  transporters: { mockTransporter },
  transformers: { mockTransformer },
}

const external2 = {
  transporters: { unrealTransporter },
}

// Tests

test('should return empty object', (t) => {
  const ret = mergeResources()

  t.deepEqual(ret, {})
})

test('should return provided resource object', (t) => {
  const ret = mergeResources(external1)

  t.is(ret.transporters?.mockTransporter, mockTransporter)
  t.is(ret.transformers?.mockTransformer, mockTransformer)
})

test('should merge several resource objects', (t) => {
  const ret = mergeResources(external1, external2)

  t.is(ret.transporters?.mockTransporter, mockTransporter)
  t.is(ret.transformers?.mockTransformer, mockTransformer)
  t.is(ret.transporters?.unrealTransporter, unrealTransporter)
})
