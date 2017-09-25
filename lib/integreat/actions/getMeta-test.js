import test from 'ava'
import nock from 'nock'
import source from '../source'
import datatype from '../datatype'
import json from '../../adapters/json'

import getMeta from './getMeta'

// Helpers

const datatypes = {meta: datatype({
  id: 'meta',
  attributes: {
    lastSyncedAt: 'date',
    count: 'integer',
    status: 'string'
  }
})}

const createSource = (id, {handleMeta = false, endpoints = {}, mappings = {}} = {}) => source({
  id,
  adapter: json,
  handleMeta,
  endpoints,
  mappings
}, {
  datatypes
})

const lastSyncedAt = new Date()
const metadata = {lastSyncedAt, count: 5, status: 'ready'}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof getMeta, 'function')
})

test('should get metadata for source', async (t) => {
  nock('http://api1.test')
    .get('/database/meta:entries')
    .reply(200, {id: 'entries', _rev: '000001', type: 'meta', attributes: metadata})
  const endpoints = {getMeta: 'http://api1.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }
  const expected = {source: 'entries', meta: {lastSyncedAt}}

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should get several metadata for source', async (t) => {
  nock('http://api2.test')
    .get('/database/meta:entries')
    .reply(200, {id: 'entries', type: 'meta', attributes: metadata})
  const endpoints = {getMeta: 'http://api2.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: ['lastSyncedAt', 'count']
  }
  const expected = {source: 'entries', meta: {lastSyncedAt, count: 5}}

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should all metadata for source', async (t) => {
  nock('http://api3.test')
    .get('/database/meta:entries')
    .reply(200, {id: 'entries', type: 'meta', attributes: metadata})
  const endpoints = {getMeta: 'http://api3.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries'
  }
  const expected = {source: 'entries', meta: {lastSyncedAt, count: 5, status: 'ready'}}

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return null for metadata when not set on source', async (t) => {
  nock('http://api4.test')
    .get('/database/meta:entries')
    .reply(200, {id: 'entries', _rev: '000001', type: 'meta'})
  const endpoints = {getMeta: 'http://api4.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }
  const expected = {source: 'entries', meta: {lastSyncedAt: null}}

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return reply from source when not ok', async (t) => {
  nock('http://api5.test')
    .get('/database/meta:entries')
    .reply(404)
  const endpoints = {getMeta: 'http://api5.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'notfound')
})

test('should return error when when handleMeta is false', async (t) => {
  const scope = nock('http://api6.test')
    .get('/database/meta:entries')
    .reply(200, {})
  const endpoints = {getMeta: 'http://api6.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: false, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.false(scope.isDone())
})

test('should get metadata from other source', async (t) => {
  nock('http://api7.test')
    .get('/database/meta:entries')
    .reply(200, {id: 'entries', _rev: '000001', type: 'meta', attributes: {lastSyncedAt}})
  const endpoints = {getMeta: 'http://api7.test/database/{type}:{id}'}
  const storeSrc = createSource('store', {endpoints, mappings: {'meta': {}}})
  const src = createSource('entries', {handleMeta: 'store'})
  const getSource = (type, source) => (source === 'entries') ? src : (source === 'store') ? storeSrc : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }
  const expected = {source: 'entries', meta: {lastSyncedAt}}

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, expected)
})

test('should return error when delegating meta to an unknown source', async (t) => {
  const src = createSource('entries', {handleMeta: 'unknown'})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error for unknown source', async (t) => {
  const getSource = (type, source) => null
  const payload = {
    source: 'entries',
    keys: 'lastSyncedAt'
  }

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no payload', async (t) => {
  const payload = null
  const src = createSource('entries')
  const getSource = () => src

  const ret = await getMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
