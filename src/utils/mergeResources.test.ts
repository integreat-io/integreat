import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  ActionHandler,
  Adapter,
  Authenticator,
  MapTransform,
  Transporter,
} from '../types.js'

import mergeResources from './mergeResources.js'

// Setup

const mockTransporter = {} as Transporter
const mockTransformer = () => () => (): unknown => undefined
const unrealTransporter = {} as Transporter
const mockHandler = {} as ActionHandler
const mockAuth1 = {} as Authenticator
const mockAuth2 = {} as Authenticator
const mockAdapter1 = {} as Adapter
const mockAdapter2 = {} as Adapter
const mockMapTransform1: MapTransform = () => async () => undefined
const mockMapTransform2: MapTransform = () => async () => undefined

const external1 = {
  transporters: { mockTransporter },
  handlers: {},
  authenticators: { mockAuth: mockAuth1 },
  transformers: { mockTransformer },
}

const external2 = {
  handlers: { mockHandler },
  authenticators: { mockAuth: mockAuth2 },
  transporters: { unrealTransporter },
}

// Tests

test('should return empty object', () => {
  const ret = mergeResources()

  assert.deepEqual(ret, {})
})

test('should return provided resource object', () => {
  const ret = mergeResources(external1)

  assert.equal(ret.transporters?.mockTransporter, mockTransporter)
  assert.equal(ret.transformers?.mockTransformer, mockTransformer)
})

test('should merge several resource objects', () => {
  const ret = mergeResources(external1, external2)

  assert.equal(ret.transporters?.mockTransporter, mockTransporter)
  assert.equal(ret.handlers?.mockHandler, mockHandler)
  assert.equal(ret.authenticators?.mockAuth, mockAuth2)
  assert.equal(ret.transformers?.mockTransformer, mockTransformer)
  assert.equal(ret.transporters?.unrealTransporter, unrealTransporter)
})

test('should keep generateUnique from the last resource providing it', () => {
  const generateUnique1 = () => 'unique1'
  const generateUnique2 = () => 'unique2'
  const resource1 = { ...external1, generateUnique: generateUnique1 }
  const resource2 = { ...external2, generateUnique: generateUnique2 }

  const ret = mergeResources(resource1, resource2, external1)

  assert.equal(ret.generateUnique, generateUnique2)
})

test('should not set generateUnique when no resource provides it', () => {
  const ret = mergeResources(external1, external2)

  assert.equal(ret.generateUnique, undefined)
})

test('should merge adapters from several resources', () => {
  const resource1 = { ...external1, adapters: { json: mockAdapter1 } }
  const resource2 = { ...external2, adapters: { xml: mockAdapter2 } }

  const ret = mergeResources(resource1, resource2)

  assert.equal(ret.adapters?.json, mockAdapter1)
  assert.equal(ret.adapters?.xml, mockAdapter2)
})

test('should let the last resource override an adapter with the same id', () => {
  const resource1 = { ...external1, adapters: { json: mockAdapter1 } }
  const resource2 = { ...external2, adapters: { json: mockAdapter2 } }

  const ret = mergeResources(resource1, resource2)

  assert.equal(ret.adapters?.json, mockAdapter2)
})

test('should keep mapTransform from the last resource providing it', () => {
  const resource1 = { ...external1, mapTransform: mockMapTransform1 }
  const resource2 = { ...external2, mapTransform: mockMapTransform2 }

  const ret = mergeResources(resource1, resource2, external1)

  assert.equal(ret.mapTransform, mockMapTransform2)
})

test('should not set mapTransform when no resource provides it', () => {
  const ret = mergeResources(external1, external2)

  assert.equal(ret.mapTransform, undefined)
})
