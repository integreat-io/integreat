import test from 'ava'
import nock from 'nock'
import service from '../service'
import schema from '../schema'
import json from '../adapters/json'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import getMeta from './getMeta'

// Helpers

const schemas = {
  meta: schema({
    id: 'meta',
    service: 'store',
    attributes: {
      lastSyncedAt: 'date',
      count: 'integer',
      status: 'string'
    },
    access: 'auth'
  })
}

const mappings = [
  setupMapping(
    {type: 'meta', service: 'store'},
    {schemas}
  )
]

const createService = (id, {meta, endpoints = []} = {}) => service({
  id,
  adapter: json,
  meta,
  endpoints
}, {
  schemas,
  mappings
})

const lastSyncedAt = new Date()
const metadata = {lastSyncedAt, count: 5, status: 'ready'}

const ident = {id: 'johnf'}

test.after((t) => {
  nock.restore()
})

// Tests

test('should get metadata for service', async (t) => {
  nock('http://api1.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({uri: 'http://api1.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    keys: 'lastSyncedAt'
  }
  const expected = {
    status: 'ok',
    data: {service: 'store', meta: {lastSyncedAt}},
    access: {status: 'granted', ident, scheme: 'data'}
  }

  const ret = await getMeta({payload, ident}, {getService})

  t.deepEqual(ret, expected)
})

test('should get several metadata for service', async (t) => {
  nock('http://api2.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api2.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    keys: ['lastSyncedAt', 'count'],
    endpoint: 'getMeta'
  }
  const expected = {service: 'store', meta: {lastSyncedAt, count: 5}}

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should all metadata for service', async (t) => {
  nock('http://api3.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api3.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store'
  }
  const expected = {service: 'store', meta: {lastSyncedAt, count: 5, status: 'ready'}}

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return null for metadata when not set on service', async (t) => {
  nock('http://api4.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta'})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api4.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    keys: 'lastSyncedAt'
  }
  const expected = {service: 'store', meta: {lastSyncedAt: null}}

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return reply from service when not ok', async (t) => {
  nock('http://api5.test')
    .get('/database/meta%3Astore')
    .reply(404)
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api5.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
})

test('should return error when when no meta type is set', async (t) => {
  const scope = nock('http://api6.test')
    .get('/database/meta%3Astore')
    .reply(200, {})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api6.test/database/{{id}'})]
  const src = createService('store', {meta: null, endpoints})
  const getService = (type, service) => (service === 'store') ? src : null
  const payload = {
    service: 'store',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.false(scope.isDone())
})

test('should get metadata from other service', async (t) => {
  nock('http://api7.test')
    .get('/database/meta%3Aentries')
    .reply(200, {id: 'entries', _rev: '000001', type: 'meta', attributes: {lastSyncedAt}})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api7.test/database/{id}'})]
  const storeSrc = createService('store', {endpoints})
  const src = createService('entries', {meta: 'meta'})
  const getService = (type, service) => (service === 'entries')
    ? src : (service === 'store' || type === 'meta') ? storeSrc : null
  const payload = {
    service: 'entries',
    keys: 'lastSyncedAt'
  }
  const expected = {service: 'entries', meta: {lastSyncedAt}}

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return error when meta is set to an unknown type', async (t) => {
  const src = createService('entries', {meta: 'unknown'})
  const getService = (type, service) => (service === 'entries') ? src : null
  const payload = {
    service: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error for unknown service', async (t) => {
  const getService = (type, service) => null
  const payload = {
    service: 'unknown',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no payload', async (t) => {
  const payload = null
  const src = createService('store')
  const getService = () => src

  const ret = await getMeta({payload, ident}, {getService})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should respond with noaccess when not authorized', async (t) => {
  nock('http://api8.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({uri: 'http://api8.test/database/{id}'})]
  const src = createService('store', {meta: 'meta', endpoints})
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    keys: 'lastSyncedAt'
  }
  const expectedAccess = {status: 'refused', ident: null, scheme: 'auth'}

  const ret = await getMeta({payload}, {getService})

  t.is(ret.status, 'noaccess')
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.deepEqual(ret.access, expectedAccess)
})
