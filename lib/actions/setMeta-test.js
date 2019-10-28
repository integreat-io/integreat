import test from 'ava'
import nock from 'nock'
import createService from '../service'
import json from 'integreat-adapter-json'
import schema from '../schema'
import setupMapping from '../mapping'

import setMeta from './setMeta'

// Helpers

const schemas = {
  meta: schema({
    id: 'meta',
    service: 'store',
    attributes: { lastSyncedAt: 'date', status: 'string' },
    access: 'auth'
  })
}

const ident = { id: 'johnf' }

const setupService = (id, { meta, endpoints = [] } = {}) => createService({
  schemas,
  mappings: [],
  setupMapping: setupMapping({ schemas })
})({
  id,
  adapter: json(),
  meta,
  endpoints,
  mappings: { meta: {} }
})

const lastSyncedAt = new Date()

test.after((t) => {
  nock.restore()
})

// Tests

test('should set metadata on service', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta%3Astore', {
      id: 'meta:store',
      type: 'meta',
      attributes: {
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy'
      },
      relationships: {}
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api1.test/database/{id}' } }]
  const src = setupService('store', { meta: 'meta', endpoints })
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    meta: { lastSyncedAt, status: 'busy' }
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: { ident } }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should not set metadata on service when no meta type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api2.test/database/{id}' } }]
  const src = setupService('store', { meta: null, endpoints })
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    meta: { lastSyncedAt }
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: { ident } }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'noaction')
  t.false(scope.isDone())
})

test('should set metadata on other service', async (t) => {
  const scope = nock('http://api3.test')
    .put('/database/meta%3Aentries', {
      id: 'meta:entries',
      type: 'meta',
      attributes: {
        lastSyncedAt: lastSyncedAt.toISOString()
      },
      relationships: {}
    })
    .reply(200, { okay: true, id: 'meta:entries', rev: '000001' })
  const endpoints = [{ id: 'setMeta', options: { uri: 'http://api3.test/database/{id}' } }]
  const storeSrc = setupService('store', { endpoints })
  const src = setupService('entries', { meta: 'meta' })
  const getService = (type, service) => (service === 'entries')
    ? src : (service === 'store' || type === 'meta') ? storeSrc : null
  const payload = {
    service: 'entries',
    meta: { lastSyncedAt },
    endpoint: 'setMeta'
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: { ident } }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return status noaction when meta is set to an unknown schema', async (t) => {
  const src = setupService('store', { meta: 'unknown' })
  const getService = (type, service) => (service === 'store') ? src : null
  const payload = {
    service: 'store',
    meta: { lastSyncedAt }
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: { ident } }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should refuse setting metadata on service when not authorized', async (t) => {
  const scope = nock('http://api4.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api4.test/database/{id}' } }]
  const src = setupService('store', { meta: 'meta', endpoints })
  const getService = (type, service) => (service === 'store' || type === 'meta') ? src : null
  const payload = {
    service: 'store',
    meta: { lastSyncedAt, status: 'busy' }
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: {} }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'noaccess', ret.error)
  t.false(scope.isDone())
})

test('should return error for unknown service', async (t) => {
  const getService = (type, service) => null
  const payload = {
    service: 'unknown',
    meta: { lastSyncedAt }
  }

  const ret = await setMeta({ type: 'SET_META', payload, meta: { ident } }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'error')
})
