import test from 'ava'
import sinon from 'sinon'
import createService from '../service/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { Transporter } from '../types.js'

import queue from './queue.js'

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
  const expected = { status: 'queued' }

  const before = Date.now()
  const ret = await queue(action, { ...handlerResources, getService, options })
  const after = Date.now()

  t.deepEqual(ret, expected)
  t.is(send.callCount, 1)
  const queuedAction = send.args[0][0]
  t.is(queuedAction.type, 'SET')
  t.deepEqual(queuedAction.payload, action.payload)
  t.deepEqual(queuedAction.meta.ident, { id: 'johnf' })
  t.true(queuedAction.meta.authorized)
  t.is(typeof queuedAction.meta?.queuedAt, 'number')
  t.true((queuedAction.meta?.queuedAt as number) >= before)
  t.true((queuedAction.meta?.queuedAt as number) <= after)
})

test('should override present queuedAt', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = createService({ schemas, mapOptions })({
    ...queueDefs,
    transporter: queueTransporter,
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const actionWithQueuedAt = {
    ...action,
    meta: {
      ...action.meta,
      queuedAt: new Date('2022-12-01T18:43:11Z').getTime(),
    },
  }

  const before = Date.now()
  await queue(actionWithQueuedAt, {
    ...handlerResources,
    getService,
    options,
  })
  const after = Date.now()

  t.is(send.callCount, 1)
  const queuedAction = send.args[0][0]
  t.is(typeof queuedAction.meta?.queuedAt, 'number')
  t.true((queuedAction.meta?.queuedAt as number) >= before)
  t.true((queuedAction.meta?.queuedAt as number) <= after)
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
  const expected = { status: 'timeout', error: 'Queue busy' }

  const ret = await queue(action, { ...handlerResources, getService, options })

  t.deepEqual(ret, expected)
})

test('should return error when queue does not respond status', async (t) => {
  const send = async () => ({}) // Intentionally no status
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = createService({ schemas, mapOptions })({
    ...queueDefs,
    transporter: queueTransporter,
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = {
    status: 'badresponse',
    error: 'Queue did not respond correctly',
  }

  const ret = await queue(action, { ...handlerResources, getService, options })

  t.deepEqual(ret, expected)
})

test('should dispatch action when queue service is unknown', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'unknown' }
  const getService = (_type?: string | string[], _service?: string) => undefined
  const expected = { status: 'ok' }

  const ret = await queue(action, {
    ...handlerResources,
    dispatch,
    getService,
    options,
  })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], action)
})
