import test from 'ava'
import nock from 'nock'
import source from '../source'
import datatype from '../datatype'
import json from '../adapters/json'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import getMeta from './getMeta'

// Helpers

const datatypes = {
  meta: datatype({
    id: 'meta',
    source: 'store',
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
    {type: 'meta', source: 'store'},
    {datatypes}
  )
]

const createSource = (id, {meta, endpoints = []} = {}) => source({
  id,
  adapter: json,
  meta,
  endpoints
}, {
  datatypes,
  mappings
})

const lastSyncedAt = new Date()
const metadata = {lastSyncedAt, count: 5, status: 'ready'}

const ident = {id: 'johnf'}

test.after((t) => {
  nock.restore()
})

// Tests

test('should get metadata for source', async (t) => {
  nock('http://api1.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({uri: 'http://api1.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    keys: 'lastSyncedAt'
  }
  const expected = {
    status: 'ok',
    data: {source: 'store', meta: {lastSyncedAt}},
    access: {status: 'granted', ident, scheme: 'data'}
  }

  const ret = await getMeta({payload, ident}, {getSource})

  t.deepEqual(ret, expected)
})

test('should get several metadata for source', async (t) => {
  nock('http://api2.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api2.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    keys: ['lastSyncedAt', 'count'],
    endpoint: 'getMeta'
  }
  const expected = {source: 'store', meta: {lastSyncedAt, count: 5}}

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should all metadata for source', async (t) => {
  nock('http://api3.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api3.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store'
  }
  const expected = {source: 'store', meta: {lastSyncedAt, count: 5, status: 'ready'}}

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return null for metadata when not set on source', async (t) => {
  nock('http://api4.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta'})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api4.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    keys: 'lastSyncedAt'
  }
  const expected = {source: 'store', meta: {lastSyncedAt: null}}

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return reply from source when not ok', async (t) => {
  nock('http://api5.test')
    .get('/database/meta%3Astore')
    .reply(404)
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api5.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
})

test('should return error when when no meta type is set', async (t) => {
  const scope = nock('http://api6.test')
    .get('/database/meta%3Astore')
    .reply(200, {})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api6.test/database/{{id}'})]
  const src = createSource('store', {meta: null, endpoints})
  const getSource = (type, source) => (source === 'store') ? src : null
  const payload = {
    source: 'store',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.false(scope.isDone())
})

test('should get metadata from other source', async (t) => {
  nock('http://api7.test')
    .get('/database/meta%3Aentries')
    .reply(200, {id: 'entries', _rev: '000001', type: 'meta', attributes: {lastSyncedAt}})
  const endpoints = [createEndpoint({id: 'getMeta', uri: 'http://api7.test/database/{id}'})]
  const storeSrc = createSource('store', {endpoints})
  const src = createSource('entries', {meta: 'meta'})
  const getSource = (type, source) => (source === 'entries')
    ? src : (source === 'store' || type === 'meta') ? storeSrc : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }
  const expected = {source: 'entries', meta: {lastSyncedAt}}

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return error when meta is set to an unknown type', async (t) => {
  const src = createSource('entries', {meta: 'unknown'})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error for unknown source', async (t) => {
  const getSource = (type, source) => null
  const payload = {
    source: 'unknown',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no payload', async (t) => {
  const payload = null
  const src = createSource('store')
  const getSource = () => src

  const ret = await getMeta({payload, ident}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should respond with noaccess when not authorized', async (t) => {
  nock('http://api8.test')
    .get('/database/meta%3Astore')
    .reply(200, {id: 'meta:store', _rev: '000001', type: 'meta', attributes: metadata})
  const endpoints = [createEndpoint({uri: 'http://api8.test/database/{id}'})]
  const src = createSource('store', {meta: 'meta', endpoints})
  const getSource = (type, source) => (source === 'store' || type === 'meta') ? src : null
  const payload = {
    source: 'store',
    keys: 'lastSyncedAt'
  }
  const expectedAccess = {status: 'refused', ident: null, scheme: 'auth'}

  const ret = await getMeta({payload}, {getSource})

  t.is(ret.status, 'noaccess')
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.deepEqual(ret.access, expectedAccess)
})
