import test from 'ava'
import sinon from 'sinon'
import Service from '../service/Service.js'
import { isAuthorizedAction } from '../service/utils/authAction.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { Transporter, Response } from '../types.js'

import service from './service.js'

// Setup

const schemas = new Map()
const mapOptions = {}

const serviceDefs = {
  id: 'someService',
  auth: true,
  options: { namespace: 'entriesQueue' },
  endpoints: [],
}

const baseTransporter: Transporter = {
  authentication: 'asObject',
  prepareOptions: (options) => options,
  connect: async () => null,
  send: async () => ({ status: 'noaction' }),
  disconnect: async () => undefined,
}

// Tests

test('should send action straight to service', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const transporter = { ...baseTransporter, send }
  const someService = new Service(
    {
      ...serviceDefs,
      transporter,
    },
    { schemas, mapOptions }
  )
  const action = {
    type: 'SERVICE',
    payload: {
      type: 'cleanUp',
      targetService: 'someService',
    },
    meta: { ident: { id: 'johnf' }, auth: {} },
  }
  const getService = (_type?: string | string[], service?: string) =>
    service === 'someService' ? someService : undefined
  const expected = { status: 'ok' }

  const ret = await service(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.is(send.callCount, 1)
  const sentAction = send.args[0][0]
  t.is(sentAction.type, action.type)
  t.deepEqual(sentAction.payload, action.payload)
  t.deepEqual(sentAction.meta.ident, action.meta.ident)
  t.true(isAuthorizedAction(sentAction))
})

test('should return error when service does not return a status', async (t) => {
  const send = async () => ({} as Response) // We intentionally don't wan't a status here
  const transporter = { ...baseTransporter, send }
  const someService = new Service(
    {
      ...serviceDefs,
      transporter,
    },
    { schemas, mapOptions }
  )
  const action = {
    type: 'SERVICE',
    payload: {
      type: 'cleanUp',
      targetService: 'someService',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const getService = (_type?: string | string[], service?: string) =>
    service === 'someService' ? someService : undefined
  const expected = {
    status: 'badresponse',
    error: "Service 'someService' did not respond correctly to SERVICE action",
    origin: 'handler:SERVICE',
  }

  const ret = await service(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return error when service is unknown', async (t) => {
  const action = {
    type: 'SERVICE',
    payload: {
      type: 'cleanUp',
      targetService: 'unknown',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const getService = (_type?: string | string[], _service?: string) => undefined
  const expected = {
    status: 'error',
    error: "Service with id 'unknown' does not exist",
    origin: 'handler:SERVICE',
  }

  const ret = await service(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})
