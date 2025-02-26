import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import dispatch from './tests/helpers/dispatch.js'
import type Service from './service/Service.js'
import type { Action } from './types.js'

import listen from './listen.js'

// Setup

// TODO: Use actual Service class rather than this mock?
const serviceMethods = {
  endpointFromAction: async () => undefined,
  authorizeAction: (action: Action) => action,
  mutateRequest: async (action: Action, _endpoint: unknown) => action,
  mutateResponse: async (_action: Action, _endpoint: unknown) => ({
    status: 'ok',
  }),
  send: async (_action: Action) => ({ status: 'ok' }),
  close: async () => ({ status: 'ok' }),
}

// Tests

test('should run listen method on all services', async () => {
  const listenStub1 = sinon.stub().resolves({ status: 'ok' })
  const listenStub2 = sinon.stub().resolves({ status: 'ok' })
  const services = [
    {
      id: 'service1',
      ...serviceMethods,
      listen: listenStub1,
    } as unknown as Service,
    {
      id: 'service2',
      ...serviceMethods,
      listen: listenStub2,
    } as unknown as Service,
  ]
  const expected = { status: 'ok' }

  const ret = await listen(services, dispatch)

  assert.deepEqual(ret, expected)
  assert.equal(listenStub1.callCount, 1)
  assert.equal(listenStub1.args[0][0], dispatch)
  assert.equal(listenStub2.callCount, 1)
})

test('should stop and return error when listen fails', async () => {
  const listenStub1 = sinon
    .stub()
    .resolves({ status: 'error', error: 'Could not go on' })
  const listenStub2 = sinon.stub().resolves({ status: 'ok' })
  const services = [
    {
      id: 'service1',
      ...serviceMethods,
      listen: listenStub1,
    } as unknown as Service,
    {
      id: 'service2',
      ...serviceMethods,
      listen: listenStub2,
    } as unknown as Service,
  ]
  const expected = {
    status: 'error',
    error: "Could not listen to service 'service1'. [error] Could not go on",
  }

  const ret = await listen(services, dispatch)

  assert.deepEqual(ret, expected)
  assert.equal(listenStub1.callCount, 1)
  assert.equal(listenStub2.callCount, 0)
})

test('should not treat noaction as error', async () => {
  const listenStub1 = sinon
    .stub()
    .resolves({ status: 'noaction', error: 'Transporter has no listen method' })
  const listenStub2 = sinon.stub().resolves({ status: 'ok' })
  const services = [
    {
      id: 'service1',
      ...serviceMethods,
      listen: listenStub1,
    } as unknown as Service,
    {
      id: 'service2',
      ...serviceMethods,
      listen: listenStub2,
    } as unknown as Service,
  ]
  const expected = { status: 'ok' }

  const ret = await listen(services, dispatch)

  assert.deepEqual(ret, expected)
  assert.equal(listenStub1.callCount, 1)
  assert.equal(listenStub2.callCount, 1)
})
