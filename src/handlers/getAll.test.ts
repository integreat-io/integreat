import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { TypedData } from '../types.js'

import getAll from './getAll.js'

// Setup

const event = (id: string, externalId?: string) => ({
  id,
  $type: 'event',
  externalId,
  createdAt: new Date(),
})

// Tests

test('should get all pages', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
    .onThirdCall()
    .resolves({ status: 'ok', data: [event('ev4')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.page, 1)
  assert.equal(dispatch.args[0][0].payload.pageSize, 2)
  assert.equal(dispatch.args[0][0].meta.ident.id, 'johnf')
  assert.equal(dispatch.args[1][0].payload.page, 2)
  assert.equal(dispatch.args[1][0].payload.pageSize, 2)
  assert.equal(dispatch.args[2][0].payload.page, 3)
  assert.equal(dispatch.args[2][0].payload.pageSize, 2)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should get all pages when last is empty', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 4)
})

test('should get one page with max number of items', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 2)
})

test('should get all pages using offset', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
    .onThirdCall()
    .resolves({ status: 'ok', data: [event('ev4')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageOffset: 0,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.pageOffset, 0)
  assert.equal(dispatch.args[0][0].payload.page, 1)
  assert.equal(dispatch.args[0][0].payload.pageSize, 2)
  assert.equal(dispatch.args[1][0].payload.pageOffset, 2)
  assert.equal(dispatch.args[1][0].payload.page, 2)
  assert.equal(dispatch.args[1][0].payload.pageSize, 2)
  assert.equal(dispatch.args[2][0].payload.pageOffset, 4)
  assert.equal(dispatch.args[2][0].payload.page, 3)
  assert.equal(dispatch.args[2][0].payload.pageSize, 2)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should get all pages starting from an offset', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageOffset: 2,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.pageOffset, 2)
  assert.equal(dispatch.args[0][0].payload.page, 2)
  assert.equal(dispatch.args[0][0].payload.pageSize, 2)
  assert.equal(dispatch.args[1][0].payload.pageOffset, 4)
  assert.equal(dispatch.args[1][0].payload.page, 3)
  assert.equal(dispatch.args[1][0].payload.pageSize, 2)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 3)
})

test('should get all pages starting from an uneven offset', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageOffset: 3,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.pageOffset, 3)
  assert.equal(dispatch.args[0][0].payload.page, 2)
  assert.equal(dispatch.args[0][0].payload.pageSize, 2)
  assert.equal(dispatch.args[1][0].payload.page, 3)
  assert.equal(dispatch.args[1][0].payload.pageOffset, 5)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 4)
})

test('should get all pages using pageAfter', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
    .onThirdCall()
    .resolves({ status: 'ok', data: [event('ev4')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageOffset: 0,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].payload.pageAfter, undefined)
  assert.equal(dispatch.args[1][0].payload.pageAfter, 'ev1')
  assert.equal(dispatch.args[2][0].payload.pageAfter, 'ev3')
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should get all pages using pageAfter with id from another field', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('id0', 'ev0'), event('id1', 'ev1')],
    })
    .onSecondCall()
    .resolves({
      status: 'ok',
      data: [event('id2', 'ev2'), event('id3', 'ev3')],
    })
    .onThirdCall()
    .resolves({ status: 'ok', data: [event('id4', 'ev4')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageOffset: 0,
      pageSize: 2,
      pageAfterField: 'externalId',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].payload.pageAfter, undefined)
  assert.equal(dispatch.args[1][0].payload.pageAfter, 'ev1')
  assert.equal(dispatch.args[2][0].payload.pageAfter, 'ev3')
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should get all pages using paging in response', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('ev0'), event('ev1')],
      paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n1' } },
    })
    .onSecondCall()
    .resolves({
      status: 'ok',
      data: [event('ev2'), event('ev3')],
      paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n2' } },
    })
    .onThirdCall()
    .resolves({
      status: 'ok',
      data: [event('ev4')],
      paging: { next: { type: 'event', pageSize: 2, pageId: undefined } },
    })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.pageId, undefined)
  assert.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  assert.deepEqual(dispatch.args[2][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n2',
  })
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should get all pages using paging when last page is full', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('ev0'), event('ev1')],
      paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n1' } },
    })
    .onSecondCall()
    .resolves({
      status: 'ok',
      data: [event('ev2'), event('ev3')],
      paging: { next: null },
    })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.equal(dispatch.args[0][0].type, 'GET')
  assert.equal(dispatch.args[0][0].payload.type, 'event')
  assert.equal(dispatch.args[0][0].payload.pageId, undefined)
  assert.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 4)
})

test('should get all pages using partial paging', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('ev0'), event('ev1')],
      paging: { next: { pageId: 't0k3n1' } },
    })
    .onSecondCall()
    .resolves({
      status: 'ok',
      data: [event('ev2')],
      paging: { next: null },
    })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  assert.equal(ret.status, 'ok', ret.error)
})

test('should require at least one non-undefined prop for next paging', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('ev0'), event('ev1')],
      paging: { next: { pageId: 't0k3n1' } },
    })
    .onSecondCall()
    .resolves({
      status: 'ok',
      data: [event('ev2'), event('ev3')],
      paging: { next: { pageId: undefined } },
    })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.equal(ret.status, 'ok', ret.error)
})

test('should handle one complete page with next null', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      status: 'ok',
      data: [event('ev0'), event('ev1')],
      paging: { next: null },
    })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 1)
  assert.equal(ret.status, 'ok', ret.error)
})

test('should use original cid for all sub actions, use id as gid, and remove id', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev2'), event('ev3')] })
    .onThirdCall()
    .resolves({ status: 'ok', data: [event('ev4')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(dispatch.args[0][0].meta?.id, undefined)
  assert.equal(dispatch.args[0][0].meta?.cid, '23456')
  assert.equal(dispatch.args[0][0].meta?.gid, '12345')
  assert.equal(dispatch.args[1][0].meta?.id, undefined)
  assert.equal(dispatch.args[1][0].meta?.cid, '23456')
  assert.equal(dispatch.args[1][0].meta?.gid, '12345')
  assert.equal(dispatch.args[2][0].meta?.id, undefined)
  assert.equal(dispatch.args[2][0].meta?.cid, '23456')
  assert.equal(dispatch.args[2][0].meta?.gid, '12345')
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 5)
})

test('should override gid of the original action', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: {
      ident: { id: 'johnf' },
      id: '12345',
      cid: '23456',
      gid: '12344', // Override this
    },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.equal(dispatch.args[0][0].meta?.gid, '12345')
})

test('should recognize loop and return error', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'GET_ALL detected a possible infinite loop',
    origin: 'handler:GET_ALL',
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(ret, expected)
})

test('should not look for loop when noLoopCheck is true', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
    .onSecondCall()
    .resolves({ status: 'ok', data: [event('ev0'), event('ev1')] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
      noLoopCheck: true,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 3)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal((ret.data as TypedData[]).length, 4)
})

test('should pass on error', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'notfound',
    error: 'Unknown endpoint',
  })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'notfound',
    error: 'Unknown endpoint',
    origin: 'handler:GET_ALL',
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(ret, expected)
})

test('should treat null data as no data', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
      pageSize: 2,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 1)
  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(ret.data, [])
})

test('should return badrequest when action has no pageSize', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
    },
    meta: { ident: { id: 'johnf' }, project: 'jetkids' },
  }
  const expected = {
    status: 'badrequest',
    origin: 'handler:GET_ALL',
    error: 'GET_ALL requires a pageSize',
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  assert.equal(dispatch.callCount, 0)
  assert.deepEqual(ret, expected)
})
