import test from 'ava'
import sinon = require('sinon')
import { Exchange, InternalDispatch } from '../types'
import { completeExchange } from '../utils/exchangeMapping'
import createError from '../utils/createError'

import sync from './sync'

// Setup

interface Handler {
  (exchange: Exchange): Exchange
}

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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data },
      }),
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data },
      }),
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data },
      }),
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
        (exchange: Exchange) => ({
          ...exchange,
          status: 'ok',
          response: { ...exchange.response, data },
        }),
        (exchange: Exchange) => ({
          ...exchange,
          status: 'ok',
          response: { ...exchange.response, data: data2 },
        }),
      ],
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: {
          ...exchange.response,
          data: [undefined, ...data, { id: 'ent0' }],
        },
      }),
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data },
      }),
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
      GET: (exchange: Exchange) => ({
        ...exchange,
        status: 'ok',
        response: { ...exchange.response, data },
      }),
      SET: (exchange: Exchange) => ({ ...exchange, status: 'ok' }),
    })
  )

  const ret = await sync(exchange, dispatch)

  t.is(ret.status, 'badrequest')
  t.is(ret.response.error, 'SYNC: `to` and `from` parameters are required')
  t.is(dispatch.callCount, 0)
})
