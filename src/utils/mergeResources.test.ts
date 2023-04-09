import test from 'ava'
import type { ActionHandler, Transporter } from '../types.js'
import type { Authenticator } from '../service/types.js'

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
  t.is(ret.handlers?.mockHandler, mockHandler)
  t.is(ret.authenticators?.mockAuth, mockAuth2)
  t.is(ret.transformers?.mockTransformer, mockTransformer)
  t.is(ret.transporters?.unrealTransporter, unrealTransporter)
})
