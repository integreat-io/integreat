import test from 'ava'
import sinon = require('sinon')
import handlerResources from '../tests/helpers/handlerResources'
import { TypedData } from '../types'

import getAll from './getAll'

// Setup

const event = (id: string, externalId?: string) => ({
  id,
  $type: 'event',
  externalId,
  createdAt: new Date(),
})

// Tests

test('should get all pages', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev2'), event('ev3')] },
    })
    .onThirdCall()
    .resolves({ type: 'GET', response: { status: 'ok', data: [event('ev4')] } })
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.page, 1)
  t.is(dispatch.args[0][0].payload.pageSize, 2)
  t.is(dispatch.args[0][0].meta.ident.id, 'johnf')
  t.is(dispatch.args[1][0].payload.page, 2)
  t.is(dispatch.args[1][0].payload.pageSize, 2)
  t.is(dispatch.args[2][0].payload.page, 3)
  t.is(dispatch.args[2][0].payload.pageSize, 2)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 5)
})

test('should get all pages when last is empty', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev2'), event('ev3')] },
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

  const ret = await getAll(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 3)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 4)
})

test('should get all pages using offset', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev2'), event('ev3')] },
    })
    .onThirdCall()
    .resolves({ type: 'GET', response: { status: 'ok', data: [event('ev4')] } })
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.pageOffset, 0)
  t.is(dispatch.args[0][0].payload.page, 1)
  t.is(dispatch.args[0][0].payload.pageSize, 2)
  t.is(dispatch.args[1][0].payload.pageOffset, 2)
  t.is(dispatch.args[1][0].payload.page, 2)
  t.is(dispatch.args[1][0].payload.pageSize, 2)
  t.is(dispatch.args[2][0].payload.pageOffset, 4)
  t.is(dispatch.args[2][0].payload.page, 3)
  t.is(dispatch.args[2][0].payload.pageSize, 2)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 5)
})

test('should get all pages starting from an offset', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({ type: 'GET', response: { status: 'ok', data: [event('ev2')] } })
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

  t.is(dispatch.callCount, 2)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.pageOffset, 2)
  t.is(dispatch.args[0][0].payload.page, 2)
  t.is(dispatch.args[0][0].payload.pageSize, 2)
  t.is(dispatch.args[1][0].payload.pageOffset, 4)
  t.is(dispatch.args[1][0].payload.page, 3)
  t.is(dispatch.args[1][0].payload.pageSize, 2)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 3)
})

test('should get all pages starting from an uneven offset', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev2'), event('ev3')] },
    })
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.pageOffset, 3)
  t.is(dispatch.args[0][0].payload.page, 2)
  t.is(dispatch.args[0][0].payload.pageSize, 2)
  t.is(dispatch.args[1][0].payload.page, 3)
  t.is(dispatch.args[1][0].payload.pageOffset, 5)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 4)
})

test('should get all pages using pageAfter', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev2'), event('ev3')] },
    })
    .onThirdCall()
    .resolves({ type: 'GET', response: { status: 'ok', data: [event('ev4')] } })
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].payload.pageAfter, undefined)
  t.is(dispatch.args[1][0].payload.pageAfter, 'ev1')
  t.is(dispatch.args[2][0].payload.pageAfter, 'ev3')
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 5)
})

test('should get all pages using pageAfter with id from another field', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('id0', 'ev0'), event('id1', 'ev1')],
      },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('id2', 'ev2'), event('id3', 'ev3')],
      },
    })
    .onThirdCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('id4', 'ev4')] },
    })
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].payload.pageAfter, undefined)
  t.is(dispatch.args[1][0].payload.pageAfter, 'ev1')
  t.is(dispatch.args[2][0].payload.pageAfter, 'ev3')
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 5)
})

test('should get all pages using paging in response', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev0'), event('ev1')],
        paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n1' } },
      },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev2'), event('ev3')],
        paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n2' } },
      },
    })
    .onThirdCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev4')],
        paging: { next: { type: 'event', pageSize: 2, pageId: undefined } },
      },
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

  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.pageId, undefined)
  t.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  t.deepEqual(dispatch.args[2][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n2',
  })
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 5)
})

test('should get all pages using paging when last page is full', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev0'), event('ev1')],
        paging: { next: { type: 'event', pageSize: 2, pageId: 't0k3n1' } },
      },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev2'), event('ev3')],
        paging: { next: null },
      },
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

  t.is(dispatch.callCount, 2)
  t.is(dispatch.args[0][0].type, 'GET')
  t.is(dispatch.args[0][0].payload.type, 'event')
  t.is(dispatch.args[0][0].payload.pageId, undefined)
  t.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 4)
})

test('should get all pages using partial paging', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev0'), event('ev1')],
        paging: { next: { pageId: 't0k3n1' } },
      },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev2')],
        paging: { next: null },
      },
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

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0].payload, {
    type: 'event',
    pageSize: 2,
    pageId: 't0k3n1',
  })
  t.is(ret.response?.status, 'ok')
})

test('should require at least one non-undefined prop for next paging', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev0'), event('ev1')],
        paging: { next: { pageId: 't0k3n1' } },
      },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: {
        status: 'ok',
        data: [event('ev2'), event('ev3')],
        paging: { next: { pageId: undefined } },
      },
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

  t.is(dispatch.callCount, 2)
  t.is(ret.response?.status, 'ok')
})

test.todo(
  'should handle one page with max number of items in a paging approach'
)

test('should recognize loop and return error', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    response: { status: 'ok', data: [event('ev0'), event('ev1')] },
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

  const ret = await getAll(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 2)
  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, 'GET_ALL detected a possible infinite loop')
  t.falsy(ret.response?.data)
})

test('should not look for loop when noLoopCheck is true', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
    .onFirstCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
    .onSecondCall()
    .resolves({
      type: 'GET',
      response: { status: 'ok', data: [event('ev0'), event('ev1')] },
    })
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

  t.is(dispatch.callCount, 3)
  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[]).length, 4)
})

test('should return error', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    response: {
      status: 'notfound',
      error: 'Unknown endpoint',
    },
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

  const ret = await getAll(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 1)
  t.is(ret.response?.status, 'notfound')
  t.is(ret.response?.error, 'Unknown endpoint')
})

test('should treat null data as no data', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: null } })
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

  t.is(dispatch.callCount, 1)
  t.is(ret.response?.status, 'ok')
  t.deepEqual(ret.response?.data, [])
})

test('should dispatch action without pageSize', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ type: 'GET', response: { status: 'ok', data: [] } })
  const action = {
    type: 'GET_ALL',
    payload: {
      type: 'event',
      page: 1,
    },
    meta: { ident: { id: 'johnf' }, project: 'jetkids' },
  }
  const expected = {
    type: 'GET',
    payload: {
      type: 'event',
      page: 1,
    },
    meta: { ident: { id: 'johnf' }, project: 'jetkids' },
  }

  const ret = await getAll(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
  t.is(ret.response?.status, 'ok')
  t.deepEqual(ret.response?.data, [])
})
