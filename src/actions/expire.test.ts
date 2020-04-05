import test from 'ava'
import sinon = require('sinon')
import { completeExchange } from '../utils/exchangeMapping'

import expire from './expire'

// Helpers

let clock: sinon.SinonFakeTimers | null = null
const theTime = Date.now()

test.before(() => {
  clock = sinon.useFakeTimers(theTime)
})

test.after.always(() => {
  clock?.restore()
})

const ident = { id: 'johnf' }

// Tests

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
    endpointId: 'getExpired',
    ident,
  })
  const expected = {
    type: 'GET',
    payload: {
      service: 'store',
      type: 'entry',
      endpoint: 'getExpired',
      onlyMappedValues: true,
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
    },
    meta: { ident },
  }

  await expire(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: {
      service: 'store',
      type: 'entry',
      params: { msFromNow: 3600000 },
    },
    endpointId: 'getExpired',
  })
  const expected = {
    payload: {
      timestamp: theTime + 3600000,
      isodate: new Date(theTime + 3600000).toISOString(),
    },
  }

  await expire(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should queue DELETE for expired entries', async (t) => {
  const data = [
    { id: 'ent1', type: 'entry' },
    { id: 'ent2', type: 'entry' },
  ]
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
    endpointId: 'getExpired',
    ident,
  })
  const expected = {
    type: 'DELETE',
    payload: { service: 'store', data },
    meta: { ident },
  }

  const ret = await expire(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
  t.truthy(ret)
  t.is(ret.status, 'queued')
})

test('should queue DELETE with id and type only', async (t) => {
  const data = [
    {
      id: 'ent1',
      type: 'entry',
      title: 'Entry 1',
      author: { id: 'johnf', type: 'user' },
    },
  ]
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
    endpointId: 'getExpired',
  })
  const expected = { payload: { data: [{ id: 'ent1', type: 'entry' }] } }

  await expire(exchange, dispatch)

  t.true(dispatch.calledWithMatch(expected))
})

test('should not queue when no expired entries', async (t) => {
  const data = []
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
    endpointId: 'getExpired',
  })

  const ret = await expire(exchange, dispatch)

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'notfound' })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
    endpointId: 'getExpired',
  })

  const ret = await expire(exchange, dispatch)

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should return error when no service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { type: 'entry' },
    endpointId: 'getExpired',
  })

  const ret = await expire(exchange, dispatch)

  t.is(ret.status, 'error')
})

test('should return error when no endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store', type: 'entry' },
  })

  const ret = await expire(exchange, dispatch)

  t.is(ret.status, 'error')
})

test('should return error when no type', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const exchange = completeExchange({
    type: 'EXPIRE',
    request: { service: 'store' },
    endpointId: 'getExpired',
  })

  const ret = await expire(exchange, dispatch)

  t.is(ret.status, 'error')
})
