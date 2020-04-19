import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import jsonAdapter from 'integreat-adapter-json'
import { EndpointDef } from '../service/endpoints/types'
import { completeExchange } from '../utils/exchangeMapping'

import setMeta from './setMeta'

// Setup

const json = jsonAdapter()

const defs = (endpoints: EndpointDef[], meta: string | null = 'meta') => ({
  schemas: [
    {
      id: 'meta',
      service: 'store',
      shape: { lastSyncedAt: 'date', status: 'string' },
      access: 'auth',
    },
  ],
  services: [
    {
      id: 'store',
      adapter: json,
      auth: true,
      meta: meta || undefined,
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] },
    },
    {
      id: 'entries',
      adapter: json,
      auth: true,
      meta: 'meta',
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] },
    },
  ],
  mappings: [],
})

const ident = { id: 'johnf' }

const lastSyncedAt = new Date()

test.after(() => {
  nock.restore()
})

// Tests

test('should set metadata on service', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta%3Astore', {
      id: 'meta:store',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy',
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api1.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'store',
      params: { meta: { lastSyncedAt, status: 'busy' } },
    },
    ident,
  })

  const ret = await setMeta(exchange, great.dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should not set metadata on service when no meta type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api2.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'store',
      params: { meta: { lastSyncedAt } },
    },
    ident,
  })

  const ret = await setMeta(exchange, great.dispatch, getService)

  t.is(ret.status, 'noaction')
  t.false(scope.isDone())
})

test('should set metadata on other service', async (t) => {
  const scope = nock('http://api3.test')
    .put('/database/meta%3Aentries', {
      id: 'meta:entries',
      lastSyncedAt: lastSyncedAt.toISOString(),
    })
    .reply(200, { okay: true, id: 'meta:entries', rev: '000001' })
  const endpoints = [
    { id: 'setMeta', options: { uri: 'http://api3.test/database/{id}' } },
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : null
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'entries',
      params: { meta: { lastSyncedAt } },
    },
    endpointId: 'setMeta',
    ident,
  })

  const ret = await setMeta(exchange, great.dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should return status noaction when meta is set to an unknown schema', async (t) => {
  const endpoints = []
  const great = Integreat.create(defs(endpoints, 'unknown'), {
    adapters: { json },
  })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'store',
      params: { meta: { lastSyncedAt } },
    },
    ident,
  })

  const ret = await setMeta(exchange, great.dispatch, getService)

  t.is(ret.status, 'noaction')
})

test('should refuse setting metadata on service when not authorized', async (t) => {
  const scope = nock('http://api4.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api4.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'store',
      params: { meta: { lastSyncedAt, status: 'busy' } },
    },
  })

  const ret = await setMeta(exchange, great.dispatch, getService)

  t.is(ret.status, 'noaccess', ret.response.error)
  t.false(scope.isDone())
})

test('should return error for unknown service', async (t) => {
  const dispatch = async () => ({ status: 'ok' })
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'SET_META',
    request: {
      service: 'unknown',
      params: { meta: { lastSyncedAt } },
    },
    ident,
  })

  const ret = await setMeta(exchange, dispatch, getService)

  t.is(ret.status, 'error')
})
