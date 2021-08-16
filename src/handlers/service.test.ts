import test from 'ava'
import sinon = require('sinon')
import createService from '../service'
import { Action, Transporter } from '../types'

import service from './service'

// Setup

const schemas = {}
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

const dispatch = async (action: Action) => ({
  ...action,
  response: { ...action.response, status: 'ok' },
})

// Tests

test('should send action straight to service', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const transporter = { ...baseTransporter, send }
  const someService = createService({ schemas, mapOptions })({
    ...serviceDefs,
    transporter,
  })
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
  const expected = { ...action, response: { status: 'ok' } }
  const sentAction = { ...action, meta: { ...action.meta, authorized: true } }

  const ret = await service(action, dispatch, getService)

  t.deepEqual(ret, expected)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][0], sentAction)
})

test('should return error when service does not return a status', async (t) => {
  const send = async () => ({ status: null })
  const transporter = { ...baseTransporter, send }
  const someService = createService({ schemas, mapOptions })({
    ...serviceDefs,
    transporter,
  })
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
    ...action,
    response: {
      status: 'badresponse',
      error:
        "Service 'someService' did not respond correctly to SERVICE action",
    },
  }

  const ret = await service(action, dispatch, getService)

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
    ...action,
    response: {
      status: 'error',
      error: "Service with id 'unknown' does not exist",
    },
  }

  const ret = await service(action, dispatch, getService)

  t.deepEqual(ret, expected)
})
