import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import jsonAdapter from 'integreat-adapter-json'
import { EndpointDef } from '../service/endpoints/types'

import setMeta from './setMeta'

// Setup

const json = jsonAdapter()

const defs = (endpoints: EndpointDef[], meta: string | null = 'meta') => ({
  schemas: [
    {
      id: 'meta',
      service: 'store',
      shape: { lastSyncedAt: 'date', status: 'string' },
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
  mappings: []
})

const ident = { id: 'johnf' }

const lastSyncedAt = new Date()

test.after(() => {
  nock.restore()
})

// Tests

// Waiting for a solution to onlyMappedValues
test.failing('should set metadata on service', async t => {
  const scope = nock('http://api1.test')
    .put('/database/meta%3Astore', {
      $type: 'meta',
      id: 'meta:store',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy'
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api1.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'store',
      meta: { lastSyncedAt, status: 'busy' }
    },
    meta: { ident }
  }

  const ret = await setMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should not set metadata on service when no meta type', async t => {
  const scope = nock('http://api2.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api2.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'store',
      meta: { lastSyncedAt }
    },
    meta: { ident }
  }

  const ret = await setMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'noaction')
  t.false(scope.isDone())
})

// Waiting for a solution to onlyMappedValues
test.failing('should set metadata on other service', async t => {
  const scope = nock('http://api3.test')
    .put('/database/meta%3Aentries', {
      $type: 'meta',
      id: 'meta:entries',
      lastSyncedAt: lastSyncedAt.toISOString()
    })
    .reply(200, { okay: true, id: 'meta:entries', rev: '000001' })
  const endpoints = [
    { id: 'setMeta', options: { uri: 'http://api3.test/database/{id}' } }
  ]
  const great = Integreat.create(defs(endpoints, null), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'entries',
      meta: { lastSyncedAt },
      endpoint: 'setMeta'
    },
    meta: { ident }
  }

  const ret = await setMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return status noaction when meta is set to an unknown schema', async t => {
  const endpoints = []
  const great = Integreat.create(defs(endpoints, 'unknown'), {
    adapters: { json }
  })
  const getService = (type, service) =>
    service === 'store' ? great.services.store : null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'store',
      meta: { lastSyncedAt }
    },
    meta: { ident }
  }

  const ret = await setMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should refuse setting metadata on service when not authorized', async t => {
  const scope = nock('http://api4.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [{ options: { uri: 'http://api4.test/database/{id}' } }]
  const great = Integreat.create(defs(endpoints), { adapters: { json } })
  const getService = (type: string, service: string) =>
    service === 'store' || type === 'meta' ? great.services.store : null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'store',
      meta: { lastSyncedAt, status: 'busy' }
    },
    meta: {}
  }

  const ret = await setMeta(action, great.dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'noaccess', ret.error)
  t.false(scope.isDone())
})

test('should return error for unknown service', async t => {
  const dispatch = async () => ({ status: 'ok' })
  const getService = () => null
  const action = {
    type: 'SET_META',
    payload: {
      service: 'unknown',
      meta: { lastSyncedAt }
    },
    meta: { ident }
  }

  const ret = await setMeta(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.status, 'error')
})
