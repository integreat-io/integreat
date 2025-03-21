import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import { isAuthorizedAction } from '../../service/utils/authAction.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import type { Transporter } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const queueService = {
  id: 'queue',
  transporter: 'queue',
  auth: true,
  options: { namespace: 'entriesQueue' },
  endpoints: [
    { match: {} },
    {
      match: { incoming: true },
      mutation: {
        $direction: 'from',
        meta: { $modify: true, queue: { $value: true } },
      },
    },
  ],
}

const defsWithQueue = {
  ...defs,
  services: [...defs.services, queueService],
  queueService: 'queue',
}

const baseTransporter: Transporter = {
  authentication: 'asObject',
  prepareOptions: (options) => options,
  connect: async () => null,
  send: async () => ({ status: 'noaction' }),
  disconnect: async () => undefined,
}

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
}

// Tests

test('should send action to queue', async () => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const resourcesWithQueue = {
    ...resources,
    transporters: {
      ...resources.transporters,
      queue: {
        ...baseTransporter,
        send,
      },
    },
  }
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { id: 'johnf' }, queue: true, id: '11004', gid: '11003' },
  }

  const great = Integreat.create(defsWithQueue, resourcesWithQueue)
  const before = Date.now()
  const ret = await great.dispatch(action)
  const after = Date.now()

  assert.equal(ret.status, 'queued', ret.error)
  assert.equal(send.callCount, 1)
  const queuedAction = send.args[0][0]
  assert.equal(queuedAction.type, 'SET')
  assert.deepEqual(queuedAction.payload, action.payload)
  assert.deepEqual(queuedAction.meta.ident, { id: 'johnf' })
  assert.equal(isAuthorizedAction(queuedAction), true)
  assert.equal(queuedAction.meta.queue, true)
  assert.equal(queuedAction.meta.id, '11004')
  assert.equal(queuedAction.meta.cid, '11004')
  assert.equal(queuedAction.meta.gid, '11003')
  assert.equal(typeof queuedAction.meta?.queuedAt, 'number')
  assert.equal((queuedAction.meta?.queuedAt as number) >= before, true)
  assert.equal((queuedAction.meta?.queuedAt as number) <= after, true)
})

test('should send action to queue when queue flag is set in incoming request mutation', async () => {
  const send = sinon.stub().resolves({ status: 'ok' })
  const resourcesWithQueue = {
    ...resources,
    transporters: {
      ...resources.transporters,
      queue: {
        ...baseTransporter,
        send,
      },
    },
  }
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item, sourceService: 'queue' },
    meta: { ident: { id: 'johnf' }, id: '11004' },
  }

  const great = Integreat.create(defsWithQueue, resourcesWithQueue)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'queued', ret.error)
  assert.equal(send.callCount, 1)
})

test('should dispatch action as normal when queue service is unknown', async () => {
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  assert.equal(ret.status, 'noaccess', ret.error) // `noaccess` means we have reached the `entries` service
})
