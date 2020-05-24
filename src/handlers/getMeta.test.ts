import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import jsonAdapter from 'integreat-adapter-json'
import { EndpointDef } from '../service/endpoints/types'
import { completeExchange } from '../utils/exchangeMapping'

import getMeta from './getMeta'

// Setup

const json = jsonAdapter()
const dispatch = async () => completeExchange({ status: 'ok' })

const defs = (endpoints: EndpointDef[], meta: string | null = 'meta') => ({
  schemas: [
    {
      id: 'meta',
      service: 'store',
      shape: {
        lastSyncedAt: 'date',
        count: 'integer',
        status: 'string',
      },
      access: 'auth',
    },
  ],
  services: [
    {
      id: 'store',
      adapter: json,
      meta: meta || undefined,
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] },
    },
    {
      id: 'entries',
      adapter: json,
      meta: 'meta',
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] },
    },
  ],
  mappings: [],
  adapters: {
    json: json,
  },
})

const mutation = { data: ['data', { $apply: 'cast_meta' }] }

const lastSyncedAt = new Date()
const metadata = { lastSyncedAt, count: 5, status: 'ready' }

const ident = { id: 'johnf' }

test.after(() => {
  nock.restore()
})

// Tests

test('should get metadata for service', async (t) => {
  nock('http://api1.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = () => great.services.store
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })
  const expectedResponse = {
    data: { service: 'store', meta: { lastSyncedAt } },
  }

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.response, expectedResponse)
})

test('should get several metadata for service', async (t) => {
  nock('http://api2.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api2.test/database/{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: ['lastSyncedAt', 'count'] },
    },
    endpointId: 'getMeta',
    ident,
  })
  const expected = { service: 'store', meta: { lastSyncedAt, count: 5 } }

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expected)
})

test('should get all metadata for service', async (t) => {
  nock('http://api3.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api3.test/database/{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
    },
    ident,
  })
  const expected = {
    service: 'store',
    meta: { lastSyncedAt, count: 5, status: 'ready' },
  }

  const ret = await getMeta(exchange, dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expected)
})

test('should return null for metadata when not set on service', async (t) => {
  nock('http://api4.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', type: 'meta' })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api4.test/database/{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })
  const expected = { service: 'store', meta: { lastSyncedAt: null } }

  const ret = await getMeta(exchange, dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expected)
})

test('should return reply from service when not ok', async (t) => {
  nock('http://api5.test').get('/database/meta%3Astore').reply(404)
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api5.test/database/{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'notfound', ret.response.error)
})

test('should return error when when no meta type is set', async (t) => {
  const scope = nock('http://api6.test')
    .get('/database/meta%3Astore')
    .reply(200, {})
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api6.test/database/{{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'store' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: 'lastSyncedAt' },
    },
    meta: { ident },
  })

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.false(scope.isDone())
})

test('should get metadata from other service', async (t) => {
  nock('http://api7.test')
    .get('/database/meta%3Aentries')
    .reply(200, { id: 'entries', _rev: '000001', lastSyncedAt })
  const endpoints = [
    {
      id: 'getMeta',
      options: { uri: 'http://api7.test/database/{id}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'entries',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })
  const expected = { service: 'entries', meta: { lastSyncedAt } }

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expected)
})

// Obsolete?
test.skip('should return error when meta is set to an unknown type', async (t) => {
  const endpoints = [] as {}[]
  const great = Integreat.create(defs(endpoints, 'unknown'), {
    adapters: { json },
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'entries',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'error')
})

test('should return error for unknown service', async (t) => {
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'unknown',
      params: { keys: 'lastSyncedAt' },
    },
    ident,
  })

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'error')
})

test('should respond with noaccess when not authorized', async (t) => {
  nock('http://api8.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [
    { options: { uri: 'http://api8.test/database/{id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const exchange = completeExchange({
    type: 'GET_META',
    request: {
      service: 'store',
      params: { keys: 'lastSyncedAt' },
    },
  })

  const ret = await getMeta(exchange, dispatch, getService)

  t.is(ret.status, 'noaccess', ret.response.error)
  t.is(typeof ret.response.error, 'string')
  t.is(ret.response.reason, 'NO_IDENT')
  t.falsy(ret.response.data)
})
