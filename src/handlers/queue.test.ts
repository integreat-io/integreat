import test from 'ava'
import sinon = require('sinon')
import createService from '../service'
import { Action, Transporter } from '../types'

import queue from './queue'

// Setup

const schemas = {}
const mapOptions = {}

const queueDefs = {
  id: 'queue',
  transporter: 'queue',
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

const action = {
  type: 'SET',
  payload: {
    type: 'entry',
    data: { $type: 'entry', id: 'ent1', title: 'Entry 1' },
    targetService: 'entries',
  },
  meta: { ident: { id: 'johnf' } },
}

const dispatch = async (action: Action) => ({
  ...action,
  response: { ...action.response, status: 'ok' },
})

// Tests

test('should send action to queue', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = createService({ schemas, mapOptions })({
    ...queueDefs,
    transporter: queueTransporter,
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = { ...action, response: { status: 'queued' } }
  const expectedQueuedData = {
    ...action,
    meta: { ident: { id: 'johnf' }, authorized: true },
  }

  const ret = await queue(action, dispatch, getService, options)

  t.deepEqual(ret, expected)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][0], expectedQueuedData)
})

test('should return error from queue', async (t) => {
  const send = async () => ({ status: 'timeout', error: 'Queue busy' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = createService({ schemas, mapOptions })({
    ...queueDefs,
    transporter: queueTransporter,
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = {
    ...action,
    response: { status: 'timeout', error: 'Queue busy' },
  }

  const ret = await queue(action, dispatch, getService, options)

  t.deepEqual(ret, expected)
})

test('should return error when queue does not respond status', async (t) => {
  const send = async () => ({ status: null })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = createService({ schemas, mapOptions })({
    ...queueDefs,
    transporter: queueTransporter,
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = {
    ...action,
    response: {
      status: 'badresponse',
      error: 'Queue did not respond correctly',
    },
  }

  const ret = await queue(action, dispatch, getService, options)

  t.deepEqual(ret, expected)
})

test('should dispatch action when queue service is unknown', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ ...action, response: { status: 'ok' } })
  const options = { queueService: 'unknown' }
  const getService = (_type?: string | string[], _service?: string) => undefined
  const expected = { ...action, response: { status: 'ok' } }

  const ret = await queue(action, dispatch, getService, options)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})
