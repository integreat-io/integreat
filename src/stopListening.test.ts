import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import type Service from './service/Service.js'

import stopListening from './stopListening.js'

// Setup

// Tests

test('should stop listening to all services that supports listening', async () => {
  const stopListening0 = sinon.stub().resolves({ status: 'ok' })
  const stopListening1 = sinon.stub().resolves({ status: 'ok' })
  const services = [
    { id: 'service0', stopListening: stopListening0 } as unknown as Service,
    { id: 'service1', stopListening: stopListening1 } as unknown as Service,
  ]
  const expectedResponse = { status: 'ok' }

  const ret = await stopListening(services)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(stopListening0.callCount, 1)
  assert.equal(stopListening1.callCount, 1)
})

test('should return errors from individual services', async () => {
  const stopListening0 = sinon.stub().resolves({ status: 'ok' })
  const stopListening1 = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Took too long' })
  const stopListening2 = sinon
    .stub()
    .resolves({ status: 'noaction', warning: 'No `stopListening()` method' })
  const services = [
    { id: 'service0', stopListening: stopListening0 } as unknown as Service,
    { id: 'service1', stopListening: stopListening1 } as unknown as Service,
    { id: 'service2', stopListening: stopListening2 } as unknown as Service,
  ]
  const expectedResponse = {
    status: 'error',
    error: '1 of 3 services failed to stop listening: [timeout] Took too long',
  }

  const ret = await stopListening(services)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(stopListening0.callCount, 1)
  assert.equal(stopListening1.callCount, 1)
})
