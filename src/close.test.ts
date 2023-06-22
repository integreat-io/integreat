import test from 'ava'
import sinon from 'sinon'
import type Service from './service/index.js'
import type { Action } from './types.js'

import close from './close.js'

// Setup

// TODO: Use actual Service class rather than this mock?
const serviceMethods = {
  endpointFromAction: () => undefined,
  authorizeAction: (action: Action) => action,
  mutateRequest: async (action: Action, _endpoint: unknown) => action,
  mutateResponse: async (_action: Action, _endpoint: unknown) => ({
    status: 'ok',
  }),
  send: async (_action: Action) => ({ status: 'ok' }),
  listen: async () => ({ status: 'ok' }),
}

// Tests

test('should close all services', async (t) => {
  const closeStub1 = sinon.stub().resolves({ status: 'ok' })
  const closeStub2 = sinon.stub().resolves({ status: 'ok' })
  const services = [
    {
      id: 'service1',
      ...serviceMethods,
      close: closeStub1,
    } as unknown as Service,
    {
      id: 'service2',
      ...serviceMethods,
      close: closeStub2,
    } as unknown as Service,
  ]
  const expected = { status: 'ok' }

  const ret = await close(services)

  t.deepEqual(ret, expected)
  t.is(closeStub1.callCount, 1)
  t.is(closeStub2.callCount, 1)
})

test('should return error when services failed to close', async (t) => {
  const closeStub1 = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Took too long' })
  const closeStub2 = sinon.stub().resolves({ status: 'ok' })
  const closeStub3 = sinon
    .stub()
    .resolves({ status: 'error', error: 'Forgotten all about it' })
  const services = [
    {
      id: 'service1',
      ...serviceMethods,
      close: closeStub1,
    } as unknown as Service,
    {
      id: 'service2',
      ...serviceMethods,
      close: closeStub2,
    } as unknown as Service,
    {
      id: 'service3',
      ...serviceMethods,
      close: closeStub3,
    } as unknown as Service,
  ]
  const expected = {
    status: 'error',
    error:
      "The following services could not close: 'service1' (timeout: Took too long), 'service3' (error: Forgotten all about it)",
  }

  const ret = await close(services)

  t.deepEqual(ret, expected)
  t.is(closeStub1.callCount, 1)
  t.is(closeStub2.callCount, 1)
  t.is(closeStub3.callCount, 1)
})
