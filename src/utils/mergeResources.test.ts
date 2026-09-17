import test from 'node:test'
import assert from 'node:assert/strict'
import type { ActionHandler, Transporter, Authenticator } from '../types.js'

import mergeResources from './mergeResources.js'

// Setup

const mockTransporter = {} as Transporter
const mockTransformer = () => () => (): unknown => undefined
const unrealTransporter = {} as Transporter
const mockHandler = {} as ActionHandler
const mockAuth1 = {} as Authenticator
const mockAuth2 = {} as Authenticator

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
