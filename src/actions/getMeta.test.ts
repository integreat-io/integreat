import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import jsonAdapter from 'integreat-adapter-json'
import { EndpointDef } from '../service/endpoints/types'

import getMeta from './getMeta'

// Setup

const json = jsonAdapter()

const defs = (endpoints: EndpointDef[], meta: string | null = 'meta') => ({
  schemas: [
    {
      id: 'meta',
      service: 'store',
      shape: {
        lastSyncedAt: 'date',
        count: 'integer',
        status: 'string'
      },
      access: 'auth'
    }
  ],
  services: [
    {
      id: 'store',
      adapter: json,
      meta: meta || undefined,
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] }
    },
    {
      id: 'entries',
      adapter: json,
      meta: 'meta',
      endpoints,
      mappings: { meta: [{ $apply: 'cast_meta' }] }
    }
  ],
  mappings: [],
  adapters: {
    json: json
  }
})

const lastSyncedAt = new Date()
const metadata = { lastSyncedAt, count: 5, status: 'ready' }

const ident = { id: 'johnf' }

test.after(() => {
  nock.restore()
})

// Tests

test('should get metadata for service', async t => {
  nock('http://api1.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [{ options: { uri: 'http://api1.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = () => great.services.store
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }
  const expected = {
    status: 'ok',
    data: { service: 'store', meta: { lastSyncedAt } },
    access: { ident } // status: 'granted', scheme: 'data'
  }

  const ret = await getMeta(action, great.dispatch, getService)

  t.deepEqual(ret, expected)
})

test('should get several metadata for service', async t => {
  nock('http://api2.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api2.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: ['lastSyncedAt', 'count'],
      endpoint: 'getMeta'
    },
    meta: { ident }
  }
  const expected = { service: 'store', meta: { lastSyncedAt, count: 5 } }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should get all metadata for service', async t => {
  nock('http://api3.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', ...metadata })
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api3.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store'
    },
    meta: { ident }
  }
  const expected = {
    service: 'store',
    meta: { lastSyncedAt, count: 5, status: 'ready' }
  }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return null for metadata when not set on service', async t => {
  nock('http://api4.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', type: 'meta' })
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api4.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }
  const expected = { service: 'store', meta: { lastSyncedAt: null } }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return reply from service when not ok', async t => {
  nock('http://api5.test')
    .get('/database/meta%3Astore')
    .reply(404)
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api5.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
})

test('should return error when when no meta type is set', async t => {
  const scope = nock('http://api6.test')
    .get('/database/meta%3Astore')
    .reply(200, {})
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api6.test/database/{{id}' } }
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (_type: string, service: string) =>
    service === 'store' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.false(scope.isDone())
})

test('should get metadata from other service', async t => {
  nock('http://api7.test')
    .get('/database/meta%3Aentries')
    .reply(200, { id: 'entries', _rev: '000001', lastSyncedAt })
  const endpoints = [
    { id: 'getMeta', options: { uri: 'http://api7.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'entries',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }
  const expected = { service: 'entries', meta: { lastSyncedAt } }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return error when meta is set to an unknown type', async t => {
  const endpoints = []
  const great = Integreat.create(defs(endpoints, 'unknown'), {
    adapters: { json }
  })
  const getService = (type, service) =>
    service === 'entries' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'entries',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }

  const ret = await getMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error for unknown service', async t => {
  const dispatch = async () => ({ status: 'ok' })
  const getService = () => null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'unknown',
      keys: 'lastSyncedAt'
    },
    meta: { ident }
  }

  const ret = await getMeta(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

// Waiting for a solution to authorization
test.failing('should respond with noaccess when not authorized', async t => {
  nock('http://api8.test')
    .get('/database/meta%3Astore')
    .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
  const endpoints = [{ options: { uri: 'http://api8.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'GET_META',
    payload: {
      service: 'store',
      keys: 'lastSyncedAt'
    },
    meta: {}
  }
  const expectedAccess = { status: 'refused', ident: null, scheme: 'auth' }

  const ret = await getMeta(action, great.dispatch, getService)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.deepEqual(ret.access, expectedAccess)
})
