import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import mapTransform from 'map-transform'
import Service from '../service/Service.js'
import { isAuthorizedAction } from '../service/utils/authAction.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { Transporter } from '../types.js'

import queue from './queue.js'

// Setup

const schemas = new Map()
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

test('should send action to queue', async () => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = new Service(
    {
      ...queueDefs,
      transporter: queueTransporter,
    },
    { schemas, mapTransform, mapOptions },
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = { status: 'queued' }

  const before = Date.now()
  const ret = await queue(action, { ...handlerResources, getService, options })
  const after = Date.now()

  assert.deepEqual(ret, expected)
  assert.equal(send.callCount, 1)
  const queuedAction = send.args[0][0]
  assert.equal(queuedAction.type, 'SET')
  assert.deepEqual(queuedAction.payload, action.payload)
  assert.deepEqual(queuedAction.meta.ident, { id: 'johnf' })
  assert.equal(isAuthorizedAction(queuedAction), true)
  assert.equal(typeof queuedAction.meta?.queuedAt, 'number')
  assert.equal((queuedAction.meta?.queuedAt as number) >= before, true)
  assert.equal((queuedAction.meta?.queuedAt as number) <= after, true)
})

test('should override present queuedAt', async () => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = new Service(
    {
      ...queueDefs,
      transporter: queueTransporter,
    },
    { schemas, mapTransform, mapOptions },
  )
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

  assert.equal(send.callCount, 1)
  const queuedAction = send.args[0][0]
  assert.equal(typeof queuedAction.meta?.queuedAt, 'number')
  assert.equal((queuedAction.meta?.queuedAt as number) >= before, true)
  assert.equal((queuedAction.meta?.queuedAt as number) <= after, true)
})

test('should return error from queue', async () => {
  const send = async () => ({ status: 'timeout', error: 'Queue busy' })
  const options = { queueService: 'queue' }
  const queueTransporter = { ...baseTransporter, send }
  const queueService = new Service(
    {
      ...queueDefs,
      transporter: queueTransporter,
    },
    { schemas, mapTransform, mapOptions },
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = {
    status: 'timeout',
    error: 'Queue busy',
    origin: 'service:queue',
  }

  const ret = await queue(action, { ...handlerResources, getService, options })

  assert.deepEqual(ret, expected)
})

test('should return error when queue does not respond status', async () => {
  const options = { queueService: 'queue' }
  const queueService = new Service(
    {
      ...queueDefs,
      transporter: baseTransporter,
    },
    { schemas, mapTransform, mapOptions },
  )
  sinon.stub(queueService, 'send').resolves({}) // Intentionally no status
  const getService = (_type?: string | string[], service?: string) =>
    service === 'queue' ? queueService : undefined
  const expected = {
    status: 'badresponse',
    error: 'Queue did not respond correctly',
    origin: 'handler:QUEUE',
  }

  const ret = await queue(action, { ...handlerResources, getService, options })

  assert.deepEqual(ret, expected)
})

test('should return error when queue service is unknown', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const options = { queueService: 'unknown' }
  const getService = (_type?: string | string[], _service?: string) => undefined
  const expected = {
    status: 'error',
    error: "Could not queue to unknown service 'unknown'",
  }

  const ret = await queue(action, {
    ...handlerResources,
    dispatch,
    getService,
    options,
  })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})
