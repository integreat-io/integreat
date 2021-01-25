import test from 'ava'
import sinon = require('sinon')
import { Exchange, InternalDispatch, TypedData } from '../types'
import { completeExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'

import sync from './sync'

// Setup

interface Handler {
  (exchange: Exchange): Exchange
}

interface Meta {
  lastSyncedAt?: Date
}

const updateExchange = (
  status: string,
  response: Record<string, unknown> = {}
) => (exchange: Exchange): Exchange => ({
  ...exchange,
  status,
  response: {
    ...exchange.response,
    ...response,
  },
})

function responseFromArray(handlers: Handler[] | Handler, exchange: Exchange) {
  const handler = Array.isArray(handlers) ? handlers.shift() : handlers
  return handler ? handler(exchange) : exchange
}

const setupDispatch = (
  handlers: Record<string, Handler[] | Handler> = {}
): InternalDispatch => async (exchange) => {
  const response = exchange
    ? responseFromArray(handlers[exchange.type], exchange)
    : null
  return response || completeExchange({ status: 'ok', response: { data: [] } })
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

test('should get from source service and set on target service', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry', params: { from: 'entries', to: 'store' } },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET',
    request: { type: 'entry', params: {} },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data, params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should not SET with no data', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry', params: { from: 'entries', to: 'store' } },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data: [] }),
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'noaction', ret.response.error)
  t.is(dispatch.callCount, 1)
  t.is(dispatch.args[0][0].type, 'GET')
})

test('should SET with no data when alwaysSet is true', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: 'entries', to: 'store', alwaysSet: true },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data: [] }),
      SET: updateExchange('ok'),
    })
  )
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data: [], params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(dispatch.callCount, 2)
  t.is(dispatch.args[0][0].type, 'GET')
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should use params from from and to', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: { service: 'entries', type: 'special', onlyPublic: true },
        to: { service: 'store', type: 'other', overwrite: false },
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET',
    request: { type: 'special', params: { onlyPublic: true } },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'other', data, params: { overwrite: false } },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should override action types', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: { service: 'entries', action: 'GET_ALL' },
        to: { service: 'store', action: 'SET_SOME' },
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_ALL: updateExchange('ok', { data }),
      SET_SOME: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET_ALL',
    request: { type: 'entry', params: {} },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'SET_SOME',
    request: { type: 'entry', data, params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should not queue SET when dontQueueSet is true', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: 'entries', to: 'store', dontQueueSet: true },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data, params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: false },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should get from several source services', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: ['entries', 'otherEntries'], to: 'store' },
    },
    target: 'store',
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET',
    request: { type: 'entry', params: {} },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'GET',
    request: { type: 'entry', params: {} },
    target: 'otherEntries',
    ident,
    meta: { project: 'project1' },
  })
  const expected3 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data: [data[0], data2[0], data[1]], params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 3)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
  t.deepEqual(dispatch.args[2][0], expected3)
})

test('should remove untyped data', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry', params: { from: 'entries', to: 'store' } },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data: [undefined, ...data, { id: 'ent0' }] }),
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET',
    request: { type: 'entry', params: {} },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data, params: {} },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should pass on updatedAfter and updatedUntil', async (t) => {
  const updatedAfter = new Date('2021-01-03T02:11:07Z')
  const updatedUntil = new Date('2021-01-18T02:14:34Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: 'entries', to: 'store', updatedAfter, updatedUntil },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET',
    request: { type: 'entry', params: { updatedAfter, updatedUntil } },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected2 = completeExchange({
    type: 'SET',
    request: { type: 'entry', data, params: { updatedAfter, updatedUntil } },
    target: 'store',
    ident,
    meta: { project: 'project1', queue: true },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0], expected2)
})

test('should use lastSyncedAt meta as updatedAfter when retrieve = updated', async (t) => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: 'entries', to: 'store', retrieve: 'updated' },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: updateExchange('ok', { data: { meta: { lastSyncedAt } } }),
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expected1 = completeExchange({
    type: 'GET_META',
    request: { params: { keys: 'lastSyncedAt' } },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expectedParams = { updatedAfter: lastSyncedAt }

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 4)
  t.deepEqual(dispatch.args[0][0], expected1)
  t.deepEqual(dispatch.args[1][0].request.params, expectedParams)
  t.deepEqual(dispatch.args[2][0].request.params, expectedParams)
})

test('should not use lastSyncedAt meta when updatedAfter is provided', async (t) => {
  const lastSyncedAt = new Date('2021-01-03T04:48:18Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        retrieve: 'updated',
        updatedAfter: new Date('2021-01-02T01:00:11Z'),
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: updateExchange('ok', { data: { meta: { lastSyncedAt } } }),
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expectedParams = { updatedAfter: new Date('2021-01-02T01:00:11Z') }

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 3)
  t.is(dispatch.args[0][0].type, 'GET')
  t.deepEqual(dispatch.args[0][0].request.params, expectedParams)
})

test('should use lastSyncedAt meta from several services', async (t) => {
  const lastSyncedAt1 = new Date('2021-01-03T04:48:18Z')
  const lastSyncedAt2 = new Date('2021-01-03T02:30:11Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: ['entries', 'other'], to: 'store', retrieve: 'updated' },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt1 } },
        }),
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt2 } },
        }),
      ],
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )
  const expectedParams3 = { updatedAfter: lastSyncedAt1 }
  const expectedParams4and5 = { updatedAfter: lastSyncedAt2 }

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(dispatch.args[0][0].type, 'GET_META')
  t.deepEqual(dispatch.args[0][0].target, 'entries')
  t.deepEqual(dispatch.args[1][0].type, 'GET_META')
  t.deepEqual(dispatch.args[1][0].target, 'other')
  t.deepEqual(dispatch.args[2][0].request.params, expectedParams3)
  t.deepEqual(dispatch.args[3][0].request.params, expectedParams4and5)
  t.deepEqual(dispatch.args[4][0].request.params, expectedParams4and5)
})

test('should filter away data updated before updatedAfter or after updatedUntil', async (t) => {
  const updatedAfter = new Date('2021-01-03T20:00:00Z')
  const updatedUntil = new Date('2021-01-04T20:00:00Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: 'entries', to: 'store', updatedAfter, updatedUntil },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', {
        data: [...data, { id: 'ent4', $type: 'entry' }, ...data2, 'invalid'],
      }),
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.true(Array.isArray(dispatch.args[1][0].request.data))
  const setData = dispatch.args[1][0].request.data as TypedData[]
  t.is(setData.length, 1)
  t.is(setData[0].id, 'ent3')
})

test('should filter away data with different lastSyncedAt for each service', async (t) => {
  const lastSyncedAt1 = new Date('2021-01-04T10:11:44Z')
  const lastSyncedAt2 = new Date('2021-01-02T00:00:00Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: { from: ['entries', 'other'], to: 'store', retrieve: 'updated' },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt1 } },
        }),
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: lastSyncedAt2 } },
        }),
      ],
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.true(Array.isArray(dispatch.args[4][0].request.data))
  const setData = dispatch.args[4][0].request.data as TypedData[]
  t.is(setData.length, 2)
  t.is(setData[0].id, 'ent3')
  t.is(setData[1].id, 'ent2')
})

test('should treat no updatedAfter as open-ended', async (t) => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        updatedAfter,
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', {
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Future data should not be filtered away with no updatedUntil
        ],
      }),
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  t.is((dispatch.args[1][0].request.data as unknown[]).length, 3)
})

test('should set updatedUntil to now', async (t) => {
  const updatedAfter = new Date('2021-01-03T10:00:00Z')
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: 'entries',
        to: 'store',
        updatedAfter,
        updatedUntil: 'now',
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', {
        data: [
          ...data,
          {
            id: 'ent4',
            $type: 'entry',
            updatedAt: new Date(Date.now() + 3600000),
          }, // Will be filtered away, as it is in the
        ],
      }),
      SET: updateExchange('ok'),
    })
  )
  const before = Date.now()

  const ret = await sync(exchange, dispatch)

  const after = Date.now()
  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
  const setUpdatedUntil = dispatch.args[1][0].request.params?.updatedUntil
  t.true(setUpdatedUntil instanceof Date)
  t.true((setUpdatedUntil as Date).getTime() >= before)
  t.true((setUpdatedUntil as Date).getTime() <= after)
  t.is((dispatch.args[1][0].request.data as unknown[]).length, 2)
})

test('should set lastSyncedAt meta to updatedUntil', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        updatedUntil: new Date('2021-01-05T00:00:00Z'),
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
      SET_META: updateExchange('ok'),
    })
  )
  const expected6 = completeExchange({
    type: 'SET_META',
    request: {
      params: { meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') } },
    },
    target: 'entries',
    ident,
    meta: { project: 'project1' },
  })
  const expected7 = completeExchange({
    type: 'SET_META',
    request: {
      params: { meta: { lastSyncedAt: new Date('2021-01-05T00:00:00Z') } },
    },
    target: 'other',
    ident,
    meta: { project: 'project1' },
  })

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(dispatch.args[5][0], expected6)
  t.deepEqual(dispatch.args[6][0], expected7)
})

test('should set lastSyncedAt meta to now when no updatedUntil', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
      SET_META: updateExchange('ok'),
    })
  )
  const before = Date.now()

  const ret = await sync(exchange, dispatch)

  const after = Date.now()
  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 7)
  const lastSyncedAt1 = (dispatch.args[5][0].request.params?.meta as Meta)
    .lastSyncedAt
  t.true(lastSyncedAt1 && lastSyncedAt1.getTime() >= before)
  t.true(lastSyncedAt1 && lastSyncedAt1.getTime() <= after)
  const lastSyncedAt2 = (dispatch.args[6][0].request.params?.meta as Meta)
    .lastSyncedAt
  t.true(lastSyncedAt2 && lastSyncedAt2.getTime() >= before)
  t.true(lastSyncedAt2 && lastSyncedAt2.getTime() <= after)
})

test('should set lastSyncedAt meta to last updatedAt from data of each service', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: ['entries', 'other'],
        to: 'store',
        retrieve: 'updated',
        setLastSyncedAtFromData: true,
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: new Date('2021-01-03T04:48:18Z') } },
        }),
        updateExchange('ok', {
          data: { meta: { lastSyncedAt: new Date('2021-01-03T02:30:11Z') } },
        }),
      ],
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
      SET_META: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 7)
  t.deepEqual(
    (dispatch.args[5][0].request.params?.meta as Meta).lastSyncedAt,
    new Date('2021-01-05T09:11:13Z')
  )
  t.deepEqual(
    (dispatch.args[6][0].request.params?.meta as Meta).lastSyncedAt,
    new Date('2021-01-03T23:50:23Z')
  )
})

test('should not get or set lastSyncedAt meta when service id is missing', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: {
      type: 'entry',
      params: {
        from: {},
        to: 'store',
        retrieve: 'updated',
        updatedUntil: new Date('2021-01-05T00:00:00Z'),
      },
    },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET_META: [],
      GET: [
        updateExchange('ok', { data }),
        updateExchange('ok', { data: data2 }),
      ],
      SET: updateExchange('ok'),
      SET_META: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'ok')
  t.is(dispatch.callCount, 2)
})

test('should return error when get action fails', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry', params: { from: 'entries', to: 'store' } },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: (exchange: Exchange) => createError(exchange, 'Fetching failed'),
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'SYNC: Could not get data. Fetching failed')
  t.is(dispatch.callCount, 1)
})

test('should return error when set action fails', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry', params: { from: 'entries', to: 'store' } },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: (exchange: Exchange) => createError(exchange, 'Service is sleeping'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'error')
  t.is(ret.response.error, 'SYNC: Could not set data. Service is sleeping')
  t.is(dispatch.callCount, 2)
})

test('should return badrequest when missing from and to', async (t) => {
  const exchange = completeExchange({
    type: 'SYNC',
    request: { type: 'entry' },
    ident,
    meta: { project: 'project1' },
  })
  const dispatch = sinon.spy(
    setupDispatch({
      GET: updateExchange('ok', { data }),
      SET: updateExchange('ok'),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'badrequest')
  t.is(
    ret.response.error,
    'SYNC: `type`, `to`, and `from` parameters are required'
  )
  t.is(dispatch.callCount, 0)
})
