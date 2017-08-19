import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import setMeta from './setMeta'

// Helpers

const createSource = (id, {handleMeta = false, endpoints = {}, mappings = {}} = {}) => source({
  id,
  adapter: couchdb,
  handleMeta,
  endpoints,
  mappings
})

const lastSyncedAt = Date.now()

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof setMeta, 'function')
})

test('should set metadata on source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta:entries', {_id: 'entries', type: 'meta', attributes: {lastSyncedAt}})
    .reply(200, {okay: true, id: 'entries', rev: '000001'})
  const endpoints = {setMeta: 'http://api1.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: true, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    key: 'lastSyncedAt',
    value: lastSyncedAt
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.true(scope.isDone())
})

test('should not set metadata on source when handleMeta is false', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/meta:entries')
    .reply(200, {okay: true, id: 'entries', rev: '000001'})
  const endpoints = {setMeta: 'http://api2.test/database/{type}:{id}'}
  const src = createSource('entries', {handleMeta: false, endpoints})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    key: 'lastSyncedAt',
    value: lastSyncedAt
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
  t.false(scope.isDone())
})

test('should set metadata on other source', async (t) => {
  const scope = nock('http://api3.test')
    .put('/database/meta:entries', {_id: 'entries', type: 'meta', attributes: {lastSyncedAt}})
    .reply(200, {okay: true, id: 'entries', rev: '000001'})
  const endpoints = {setMeta: 'http://api3.test/database/{type}:{id}'}
  const storeSrc = createSource('store', {endpoints, mappings: {'meta': {}}})
  const src = createSource('entries', {handleMeta: 'store'})
  const getSource = (type, source) => (source === 'entries') ? src : (source === 'store') ? storeSrc : null
  const payload = {
    source: 'entries',
    key: 'lastSyncedAt',
    value: lastSyncedAt
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.true(scope.isDone())
})

test('should return status noaction when delegation meta to an unknown source', async (t) => {
  const src = createSource('entries', {handleMeta: 'unknown'})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    source: 'entries',
    key: 'lastSyncedAt',
    value: lastSyncedAt
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should return error for unknown source', async (t) => {
  const getSource = (type, source) => null
  const payload = {
    source: 'entries',
    key: 'lastSyncedAt',
    value: lastSyncedAt
  }

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource('entries')
  const getSource = () => src

  const ret = await setMeta(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
