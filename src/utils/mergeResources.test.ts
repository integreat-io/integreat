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
