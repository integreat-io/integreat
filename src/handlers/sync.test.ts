import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import { createErrorResponse } from '../utils/response.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { Response, HandlerDispatch, TypedData } from '../types.js'

import sync from './sync.js'

// Setup

interface Meta {
  lastSyncedAt?: Date
}

function responseFromArray(responses: Response[] | Response) {
  return Array.isArray(responses) ? responses.shift() : responses
}

const setupDispatch =
  (handlers: Record<string, Response[] | Response> = {}): HandlerDispatch =>
  async (action) => {
    const response = action ? responseFromArray(handlers[action.type]) : null
    return response || { status: 'ok', data: [] }
  }

const data = [
  {
    id: 'ent1',
    $type: 'entry',
    title: 'Entry 1',
    createdAt: new Date('2021-01-03T18:43:11Z'),
    updatedAt: new Date('2021-01-03T18:43:11Z'),
  },
  {
    id: 'ent2',
    $type: 'entry',
    title: 'Entry 2',
    createdAt: new Date('2021-01-03T18:45:07Z'),
    updatedAt: new Date('2021-01-05T09:11:13Z'),
  },
]

const data2 = [
  {
    id: 'ent3',
    $type: 'entry',
    title: 'Entry 3',
    createdAt: new Date('2021-01-04T23:49:58Z'),
    updatedAt: new Date('2021-01-03T23:50:23Z'),
  },
]

const ident = { id: 'johnf' }

// Tests

test('should get from source service and set on target service', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1', id: 'sync1', cid: '12345' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expectedAction0 = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'entries' },
    meta: { ident, project: 'project1', cid: '12345', gid: 'sync1' },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: { type: 'entry', data, targetService: 'store' },
    meta: {
      ident,
      project: 'project1',
      cid: '12345',
      gid: 'sync1',
      queue: true,
    },
  }
  const expected = { status: 'ok' }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0], expectedAction1)
})

test('should not SET with no data', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [] },
      SET: { status: 'ok' },
    }),
  )
  const expected = {
    status: 'noaction',
    warning: 'SYNC: No data to set',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
  assert.equal(dispatch.args[0][0].type, 'GET')
})

test('should SET with no data when alwaysSet is true', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      alwaysSet: true,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [] },
      SET: { status: 'ok' },
    }),
  )
  const expected1 = {
    type: 'SET',
    payload: { type: 'entry', data: [], targetService: 'store' },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should split in several SET actions when item count is higher than maxPerSet', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      maxPerSet: 2,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [...data, ...data2] },
      SET: { status: 'ok' },
    }),
  )
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [data[0], data2[0]],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [data[1]],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(dispatch.args[1][0], expected1)
  assert.deepEqual(dispatch.args[2][0], expected2)
})

test('should split in several SET actions with individual items when setMember is true', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      setMember: true,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [...data, ...data2] },
      SET: { status: 'ok' },
    }),
  )
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: data[0],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: data2[0],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }
  const expected3 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: data[1],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[1][0], expected1)
  assert.deepEqual(dispatch.args[2][0], expected2)
  assert.deepEqual(dispatch.args[3][0], expected3)
})

test('should use params from from and to', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: { service: 'entries', type: 'special', onlyPublic: true },
      to: { service: 'store', type: 'other', overwrite: false },
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: {
      type: 'special',
      onlyPublic: true,
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'other',
      data,
      overwrite: false,
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should override action types', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: { service: 'entries', action: 'GET_ALL' },
      to: { service: 'store', action: 'SET_SOME' },
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_ALL: { status: 'ok', data },
      SET_SOME: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET_ALL',
    payload: { type: 'entry', targetService: 'entries' },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET_SOME',
    payload: { type: 'entry', data, targetService: 'store' },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should set page params on payload', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: {
        service: 'entries',
        other: true,
        page: 1,
        pageOffset: 3,
        pageSize: 500,
        pageAfter: 'ent3',
        pageBefore: 'ent5',
        pageId: 'page1',
      },
      to: 'store',
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected = {
    type: 'GET',
    payload: {
      type: 'entry',
      other: true,
      targetService: 'entries',
      page: 1,
      pageOffset: 3,
      pageSize: 500,
      pageAfter: 'ent3',
      pageBefore: 'ent5',
      pageId: 'page1',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(dispatch.args[0][0], expected)
  assert.equal(dispatch.callCount, 2)
})

test('should not queue SET when doQueueSet is false', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      doQueueSet: false,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected1 = {
    type: 'SET',
    payload: { type: 'entry', data, targetService: 'store' },
    meta: { ident, project: 'project1', gid: 'sync1', queue: false },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should get from several source services', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'otherEntries'],
      to: 'store',
      targetService: 'store',
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'entries' },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'otherEntries' },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [data[0], data2[0], data[1]],
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
  assert.deepEqual(dispatch.args[2][0], expected2)
})

test('should remove untyped data', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [undefined, ...data, { id: 'ent0' }] },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'entries' },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: { type: 'entry', data, targetService: 'store' },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should report progress', async () => {
  const setProgress = sinon.stub()
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1', id: 'sync1', cid: '12345' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch, setProgress })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(setProgress.callCount, 5)
  assert.equal(setProgress.args[0][0], 0)
  assert.equal(setProgress.args[1][0], 0.1)
  assert.equal(setProgress.args[2][0], 0.5)
  assert.equal(setProgress.args[3][0], 0.9)
  assert.equal(setProgress.args[4][0], 1)
})

test.todo('should report progress with several sources')

test('should pass on updatedAfter and updatedUntil, and set updatedSince and updatedBefore', async () => {
  const updatedAfter = new Date('2021-01-03T02:11:07Z')
  const updatedSince = new Date('2021-01-03T02:11:07.001Z')
  const updatedUntil = new Date('2021-01-18T02:14:34Z')
  const updatedBefore = new Date('2021-01-18T02:14:34.001Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
      updatedUntil,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: {
      type: 'entry',
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should pass on updatedSince and updatedBefore, and set updatedAfter and updatedUntil', async () => {
  const updatedAfter = new Date('2021-01-03T02:11:06.999Z')
  const updatedSince = new Date('2021-01-03T02:11:07Z')
  const updatedUntil = new Date('2021-01-18T02:14:33.999Z')
  const updatedBefore = new Date('2021-01-18T02:14:34Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedSince,
      updatedBefore,
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: {
      type: 'entry',
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should cast string values in updatedAfter and updatedUntil to Date', async () => {
  const updatedAfter = new Date('2021-01-03T02:11:07Z')
  const updatedSince = new Date('2021-01-03T02:11:07.001Z')
  const updatedUntil = new Date('2021-01-18T02:14:34Z')
  const updatedBefore = new Date('2021-01-18T02:14:34.001Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter: '2021-01-03T02:11:07Z',
      updatedUntil: '2021-01-18T02:14:34Z',
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: {
      type: 'entry',
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should cast string values in updatedSince and updatedBefore to Date', async () => {
  const updatedAfter = new Date('2021-01-03T02:11:06.999Z')
  const updatedSince = new Date('2021-01-03T02:11:07Z')
  const updatedUntil = new Date('2021-01-18T02:14:33.999Z')
  const updatedBefore = new Date('2021-01-18T02:14:34Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedSince: '2021-01-03T02:11:07Z',
      updatedBefore: '2021-01-18T02:14:34Z',
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected0 = {
    type: 'GET',
    payload: {
      type: 'entry',
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data,
      updatedAfter,
      updatedSince,
      updatedUntil,
      updatedBefore,
      targetService: 'store',
    },
    meta: { ident, project: 'project1', gid: 'sync1', queue: true },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expected0)
  assert.deepEqual(dispatch.args[1][0], expected1)
})

test('should use lastSyncedAt meta as updatedAfter when retrieve = updated', async () => {
  const lastSyncedAt = '2021-01-03T04:48:18Z'
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      retrieve: 'updated',
    },
    meta: { ident, project: 'project1', id: 'sync1', cid: '12345' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expectedAction0 = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      keys: 'lastSyncedAt',
      metaKey: undefined,
      targetService: 'entries',
    },
    meta: { ident, cid: '12345', gid: 'sync1', project: 'project1' },
  }
  const expectedUpdatedAfter = new Date(lastSyncedAt)
  const expectedUpdatedSince = new Date('2021-01-03T04:48:18.001Z')

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(
    dispatch.args[1][0].payload.updatedAfter,
    expectedUpdatedAfter,
  )
  assert.deepEqual(
    dispatch.args[1][0].payload.updatedSince,
    expectedUpdatedSince,
  )
  assert.deepEqual(
    dispatch.args[2][0].payload.updatedAfter,
    expectedUpdatedAfter,
  )
  assert.deepEqual(
    dispatch.args[2][0].payload.updatedSince,
    expectedUpdatedSince,
  )
})

test('should use metaKey when fetching lastSyncedAt', async () => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      retrieve: 'updated',
      metaKey: 'sports',
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expectedAction0 = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      keys: 'lastSyncedAt',
      metaKey: 'sports',
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
})

test('should not use lastSyncedAt meta when updatedAfter is provided', async () => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      retrieve: 'updated',
      updatedAfter: new Date('2021-01-02T01:00:11Z'),
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expectedUpdatedAfter = new Date('2021-01-02T01:00:11Z')
  const expectedUpdatedSince = new Date('2021-01-02T01:00:11.001Z')

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.deepEqual(
    dispatch.args[0][0].payload.updatedAfter,
    expectedUpdatedAfter,
  )
  assert.deepEqual(
    dispatch.args[0][0].payload.updatedSince,
    expectedUpdatedSince,
  )
})

test('should use lastSyncedAt meta from several services', async () => {
  const lastSyncedAt1 = new Date('2021-01-03T04:48:18Z')
  const lastSyncedAt2 = new Date('2021-01-03T02:30:11Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      metaKey: 'sports',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt1 } } },
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt2 } } },
      ],
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(dispatch.args[0][0].type, 'GET_META')
  assert.deepEqual(dispatch.args[0][0].payload.type, 'entry')
  assert.deepEqual(dispatch.args[0][0].payload.targetService, 'entries')
  assert.deepEqual(dispatch.args[0][0].payload.metaKey, 'sports')
  assert.deepEqual(dispatch.args[1][0].type, 'GET_META')
  assert.deepEqual(dispatch.args[1][0].payload.type, 'entry')
  assert.deepEqual(dispatch.args[1][0].payload.targetService, 'other')
  assert.deepEqual(dispatch.args[1][0].payload.metaKey, 'sports')
  assert.deepEqual(dispatch.args[2][0].payload.updatedAfter, lastSyncedAt1)
  assert.deepEqual(
    dispatch.args[2][0].payload.updatedSince,
    new Date('2021-01-03T04:48:18.001Z'),
  )
  assert.deepEqual(dispatch.args[3][0].payload.updatedAfter, lastSyncedAt2)
  assert.deepEqual(
    dispatch.args[3][0].payload.updatedSince,
    new Date('2021-01-03T02:30:11.001Z'),
  )
  assert.deepEqual(dispatch.args[4][0].payload.updatedAfter, lastSyncedAt2)
  assert.deepEqual(
    dispatch.args[4][0].payload.updatedSince,
    new Date('2021-01-03T02:30:11.001Z'),
  )
})

test('should return error when lastSyncedAt could not be fetched', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      retrieve: 'updated',
    },
    meta: { ident, project: 'project1', id: 'sync1', cid: '12345' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'timeout', error: 'Too slow' },
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected = {
    status: 'error',
    error:
      "Failed to prepare params for SYNC: Could not fetch last synced date for service 'entries': [timeout] Too slow",
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
})

test('should filter away data updated before updatedAfter or after updatedUntil', async () => {
  const updatedAfter = new Date('2021-01-03T20:00:00Z')
  const updatedUntil = new Date('2021-01-04T20:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
      updatedUntil,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [...data, { id: 'ent4', $type: 'entry' }, ...data2, 'invalid'],
      },
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.equal(Array.isArray(dispatch.args[1][0].payload.data), true)
  const setData = dispatch.args[1][0].payload.data as TypedData[]
  assert.equal(setData.length, 1)
  assert.equal(setData[0].id, 'ent3')
})

test('should filter away data with different lastSyncedAt for each service', async () => {
  const lastSyncedAt1 = new Date('2021-01-04T10:11:44Z')
  const lastSyncedAt2 = new Date('2021-01-02T00:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt1 } } },
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt2 } } },
      ],
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.equal(Array.isArray(dispatch.args[4][0].payload.data), true)
  const setData = dispatch.args[4][0].payload.data as TypedData[]
  assert.equal(setData.length, 2)
  assert.equal(setData[0].id, 'ent3')
  assert.equal(setData[1].id, 'ent2')
})

test('should not filter away data when filterData is false', async () => {
  const lastSyncedAt1 = new Date('2021-01-04T10:11:44Z')
  const lastSyncedAt2 = new Date('2021-01-02T00:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      doFilterData: false,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt1 } } },
        { status: 'ok', data: { meta: { lastSyncedAt: lastSyncedAt2 } } },
      ],
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.equal(Array.isArray(dispatch.args[4][0].payload.data), true)
  const setData = dispatch.args[4][0].payload.data as TypedData[]
  assert.equal(setData.length, 3)
})

test('should treat no updatedAfter as open-ended', async () => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Future data should not be filtered away with no updatedUntil
        ],
      },
      SET: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.equal((dispatch.args[1][0].payload.data as unknown[]).length, 3)
})

test('should set updatedUntil to now', async () => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
      updatedUntil: 'now',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: {
        status: 'ok',
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Will be filtered away, as it is in the
        ],
      },
      SET: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  const setUpdatedUntil = dispatch.args[1][0].payload.updatedUntil
  assert.equal(setUpdatedUntil instanceof Date, true)
  assert.equal((setUpdatedUntil as Date).getTime() >= before, true)
  assert.equal((setUpdatedUntil as Date).getTime() <= after, true)
  assert.equal((dispatch.args[1][0].payload.data as unknown[]).length, 2)
})

test('should set updatedUntil with positive delta', async () => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
      updatedUntil: '+1h',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  const setUpdatedUntil = dispatch.args[1][0].payload.updatedUntil
  assert.equal(setUpdatedUntil instanceof Date, true)
  assert.equal((setUpdatedUntil as Date).getTime() >= before + 3600000, true)
  assert.equal((setUpdatedUntil as Date).getTime() <= after + 3600000, true)
})

test('should set updatedUntil with negative delta', async () => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      updatedAfter,
      updatedUntil: '-30m',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  const setUpdatedUntil = dispatch.args[1][0].payload.updatedUntil
  assert.equal(setUpdatedUntil instanceof Date, true)
  assert.equal((setUpdatedUntil as Date).getTime() >= before - 1800000, true)
  assert.equal((setUpdatedUntil as Date).getTime() <= after - 1800000, true)
})

test('should set lastSyncedAt meta to updatedUntil', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      updatedUntil: new Date('2021-01-05T00:00:00Z'),
    },
    meta: { ident, id: 'sync1', cid: '12345', project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok' },
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )
  const expected5 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: undefined,
      targetService: 'entries',
    },
    meta: { ident, cid: '12345', gid: 'sync1', project: 'project1' },
  }
  const expected6 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: undefined,
      targetService: 'other',
    },
    meta: { ident, cid: '12345', gid: 'sync1', project: 'project1' },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(dispatch.args[5][0], expected5)
  assert.deepEqual(dispatch.args[6][0], expected6)
})

test('should set lastSyncedAt meta to now when no updatedUntil', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok' },
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  const lastSyncedAt1 = (dispatch.args[5][0].payload.meta as Meta).lastSyncedAt
  assert.equal(lastSyncedAt1 && lastSyncedAt1.getTime() >= before, true)
  assert.equal(lastSyncedAt1 && lastSyncedAt1.getTime() <= after, true)
  const lastSyncedAt2 = (dispatch.args[6][0].payload.meta as Meta).lastSyncedAt
  assert.equal(lastSyncedAt2 && lastSyncedAt2.getTime() >= before, true)
  assert.equal(lastSyncedAt2 && lastSyncedAt2.getTime() <= after, true)
})

test('should set lastSyncedAt meta to last updatedAt from data of each service', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      setLastSyncedAtFromData: true,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T04:48:18Z') } },
        },
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T02:30:11Z') } },
        },
      ],
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(
    (dispatch.args[5][0].payload.meta as Meta).lastSyncedAt,
    new Date('2021-01-05T09:11:13Z'),
  )
  assert.deepEqual(
    (dispatch.args[6][0].payload.meta as Meta).lastSyncedAt,
    new Date('2021-01-03T23:50:23Z'),
  )
})

test('should set lastSyncedAt to now when date is in the future', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      setLastSyncedAtFromData: true,
    },
    meta: { ident, project: 'project1' },
  }
  const dataWithFutureUpdate = [
    data[0],
    {
      ...data[1],
      updatedAt: new Date(Date.now() + 3600000),
    },
  ]
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T04:48:18Z') } },
        },
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T02:30:11Z') } },
        },
      ],
      GET: [
        { status: 'ok', data: dataWithFutureUpdate },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  const updatedAt = (dispatch.args[5][0].payload.meta as Meta)
    .lastSyncedAt as Date
  assert.equal(updatedAt.getTime() >= before, true)
  assert.equal(updatedAt.getTime() <= after, true)
})

test('should use metaKey when setting lastSyncedAt', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'updated',
      metaKey: 'sports',
      updatedUntil: new Date('2021-01-05T00:00:00Z'),
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok' },
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )
  const expected5 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: 'sports',
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected6 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: 'sports',
      targetService: 'other',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(dispatch.args[5][0], expected5)
  assert.deepEqual(dispatch.args[6][0], expected6)
})

test('should not get or set lastSyncedAt meta when service id is missing', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: {},
      to: 'store',
      retrieve: 'updated',
      updatedUntil: new Date('2021-01-05T00:00:00Z'),
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
})

test('should use lastSyncedAt meta as updatedAfter when retrieve = created', async () => {
  const lastSyncedAt = '2021-01-03T04:48:18Z'
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      retrieve: 'created',
    },
    meta: { ident, project: 'project1', id: 'sync1', cid: '12345' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok', data: { meta: { lastSyncedAt } } },
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expectedAction0 = {
    type: 'GET_META',
    payload: {
      type: 'entry',
      keys: 'lastSyncedAt',
      metaKey: undefined,
      targetService: 'entries',
    },
    meta: { ident, cid: '12345', gid: 'sync1', project: 'project1' },
  }
  const expectedCreatedAfter = new Date(lastSyncedAt)
  const expectedCreatedSince = new Date('2021-01-03T04:48:18.001Z')

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(
    dispatch.args[1][0].payload.createdAfter,
    expectedCreatedAfter,
  )
  assert.deepEqual(
    dispatch.args[1][0].payload.createdSince,
    expectedCreatedSince,
  )
  assert.deepEqual(
    dispatch.args[2][0].payload.createdAfter,
    expectedCreatedAfter,
  )
  assert.deepEqual(
    dispatch.args[2][0].payload.createdSince,
    expectedCreatedSince,
  )
})

test('should set lastSyncedAt for created', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'created',
      metaKey: 'sports',
      createdUntil: new Date('2021-01-05T00:00:00Z'),
    },
    meta: { ident, project: 'project1', id: 'sync1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: { status: 'ok' },
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )
  const expected4 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [data[0], data[1], data2[0]], // Sorted after createdAt
      createdBefore: new Date('2021-01-05T00:00:00.001Z'),
      createdUntil: new Date('2021-01-05 00:00:00Z'),
      targetService: 'store',
    },
    meta: { ident, project: 'project1', queue: true, gid: 'sync1' },
  }
  const expected5 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: 'sports',
      targetService: 'entries',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }
  const expected6 = {
    type: 'SET_META',
    payload: {
      type: 'entry',
      meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') },
      metaKey: 'sports',
      targetService: 'other',
    },
    meta: { ident, project: 'project1', gid: 'sync1' },
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(dispatch.args[4][0], expected4)
  assert.deepEqual(dispatch.args[5][0], expected5)
  assert.deepEqual(dispatch.args[6][0], expected6)
})

test('should set createdUntil with delta', async () => {
  const createdAfter = new Date('2021-01-03T10:00:00Z')
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      createdAfter,
      createdUntil: '+1h',
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const before = Date.now()

  const ret = await sync(action, { ...handlerResources, dispatch })

  const after = Date.now()
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  const setCreatedUntil = dispatch.args[1][0].payload.createdUntil
  assert.equal(setCreatedUntil instanceof Date, true)
  assert.equal((setCreatedUntil as Date).getTime() >= before + 3600000, true)
  assert.equal((setCreatedUntil as Date).getTime() <= after + 3600000, true)
})

test('should set lastSyncedAt meta to last createdAt from data of each service', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: ['entries', 'other'],
      to: 'store',
      retrieve: 'created',
      setLastSyncedAtFromData: true,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T04:48:18Z') } },
        },
        {
          status: 'ok',
          data: { meta: { lastSyncedAt: new Date('2021-01-03T02:30:11Z') } },
        },
      ],
      GET: [
        { status: 'ok', data },
        { status: 'ok', data: data2 },
      ],
      SET: { status: 'ok' },
      SET_META: { status: 'ok' },
    }),
  )

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 7)
  assert.deepEqual(
    (dispatch.args[5][0].payload.meta as Meta).lastSyncedAt,
    new Date('2021-01-03T18:45:07Z'),
  )
  assert.deepEqual(
    (dispatch.args[6][0].payload.meta as Meta).lastSyncedAt,
    new Date('2021-01-04T23:49:58Z'),
  )
})

test('should return error when get action fails', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: createErrorResponse('Fetching failed', 'handler:GET'),
      SET: { status: 'ok' },
    }),
  )
  const expected = {
    status: 'error',
    error: 'SYNC: Could not get data. Fetching failed',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should return error when set action fails', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry', from: 'entries', to: 'store' },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: createErrorResponse('Service is sleeping', 'handler:SET'),
    }),
  )
  const expected = {
    status: 'error',
    error: 'SYNC: Setting data failed. Service is sleeping',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should return error from first SET action with maxPerSet', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      maxPerSet: 2,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [...data, ...data2] },
      SET: [{ status: 'timeout' }, { status: 'ok' }],
    }),
  )
  const expected = {
    status: 'timeout',
    error: 'SYNC: Setting data failed.',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should return error from second SET action with maxPerSet', async () => {
  const action = {
    type: 'SYNC',
    payload: {
      type: 'entry',
      from: 'entries',
      to: 'store',
      maxPerSet: 2,
    },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data: [...data, ...data2] },
      SET: [{ status: 'ok' }, { status: 'timeout' }],
    }),
  )
  const expected = {
    status: 'timeout',
    error:
      'SYNC: Setting data failed, but the first 2 items where set successfully.',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 3)
})

test('should return badrequest when missing from and to', async () => {
  const action = {
    type: 'SYNC',
    payload: { type: 'entry' },
    meta: { ident, project: 'project1' },
  }
  const dispatch = sinon.spy(
    setupDispatch({
      GET: { status: 'ok', data },
      SET: { status: 'ok' },
    }),
  )
  const expected = {
    status: 'badrequest',
    error: 'SYNC: `type`, `to`, and `from` parameters are required',
    origin: 'handler:SYNC',
  }

  const ret = await sync(action, { ...handlerResources, dispatch })

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})
