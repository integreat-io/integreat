import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import { jsonServiceDef } from '../tests/helpers/json'
import mutations from '../mutations'
import resources from '../tests/helpers/resources'
import { EndpointDef } from '../service/endpoints/types'
import { Action } from '../types'

import setMeta from './setMeta'

// Setup

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
      ...jsonServiceDef,
      auth: true,
      meta: meta || undefined,
      endpoints,
    },
    {
      id: 'entries',
      ...jsonServiceDef,
      auth: true,
      meta: 'meta',
      endpoints,
    },
  ],
  mutations,
})

const mutation = { data: ['data', { $apply: 'cast_meta' }] }

const ident = { id: 'johnf' }
const lastSyncedAt = new Date()
const dispatch = async (action: Action) => ({
  ...action,
  response: { ...action.response, status: 'ok' },
})

test.after(() => {
  nock.restore()
})

// Tests

test('should set metadata on service', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta:store', {
      id: 'meta:store',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy',
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{{params.id}}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt, status: 'busy' } },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should set metadata on service with type', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta:store:product', {
      id: 'meta:store:product',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy',
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{{params.id}}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      type: 'product',
      params: { meta: { lastSyncedAt, status: 'busy' } },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should set metadata on service with several types', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta:store:entry|article', {
      id: 'meta:store:entry|article',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy',
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{{params.id}}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      type: ['entry', 'article'],
      params: { meta: { lastSyncedAt, status: 'busy' } },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should set metadata on service with metaKey', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/meta:store:product:hardware', {
      id: 'meta:store:product:hardware',
      lastSyncedAt: lastSyncedAt.toISOString(),
      status: 'busy',
    })
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api1.test/database/{{params.id}}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      type: 'product',
      params: { meta: { lastSyncedAt, status: 'busy' }, metaKey: 'hardware' },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should not set metadata on service when no meta type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api2.test/database/{id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints, null), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt } },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'noaction')
  t.false(scope.isDone())
})

test('should set metadata on other service', async (t) => {
  const scope = nock('http://api3.test')
    .put('/database/meta:entries', {
      id: 'meta:entries',
      lastSyncedAt: lastSyncedAt.toISOString(),
    })
    .reply(200, { okay: true, id: 'meta:entries', rev: '000001' })
  const endpoints = [
    {
      id: 'setMeta',
      options: { uri: 'http://api3.test/database/{{params.id}}' },
      mutation,
    },
  ]
  const great = Integreat.create(defs(endpoints, null), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'entries'
      ? great.services.entries
      : service === 'store' || type === 'meta'
      ? great.services.store
      : undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt } },
      targetService: 'entries',
      endpoint: 'setMeta',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should return status noaction when meta is set to an unknown schema', async (t) => {
  const endpoints = [] as EndpointDef[]
  const great = Integreat.create(defs(endpoints, 'unknown'), resources)
  const getService = (_type?: string | string[], service?: string) =>
    service === 'store' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt } },
      targetService: 'store',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'noaction')
  t.is(typeof ret.response?.error, 'string')
})

test('should refuse setting metadata on service when not authorized', async (t) => {
  const scope = nock('http://api4.test')
    .put('/database/meta%3Astore')
    .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
  const endpoints = [
    { options: { uri: 'http://api4.test/database/{id}' }, mutation },
  ]
  const great = Integreat.create(defs(endpoints), resources)
  const getService = (type?: string | string[], service?: string) =>
    service === 'store' || type === 'meta' ? great.services.store : undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt, status: 'busy' } },
      targetService: 'store',
    },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'noaccess', ret.response?.error)
  t.false(scope.isDone())
})

test('should return error for unknown service', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'SET_META',
    payload: {
      params: { meta: { lastSyncedAt } },
      targetService: 'unknown',
    },
    meta: { ident },
  }

  const ret = await setMeta(action, dispatch, getService)

  t.is(ret.response?.status, 'error')
})
