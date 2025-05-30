import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import Integreat from '../index.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import resources from '../tests/helpers/resources/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { EndpointDef } from '../service/types.js'

import setMeta from './setMeta.js'

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
  mutations: {},
})

const mutation = [
  {
    $direction: 'to',
    payload: 'payload',
    'payload.data': ['payload.data', { $cast: 'meta' }],
  },
  {
    $direction: 'from',
    response: 'response',
    'response.data': ['response.data', { $cast: 'meta' }],
  },
]

const ident = { id: 'johnf' }
const lastSyncedAt = new Date()

test('setMeta handler', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should set metadata on service', async () => {
    const scope = nock('http://api1.test')
      .put('/database/meta:store', {
        id: 'meta:store',
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy',
      })
      .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'SET_META',
      payload: {
        meta: { lastSyncedAt, status: 'busy' },
        targetService: 'store',
      },
      meta: { ident },
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should pass on action type and meta id', async () => {
    const scope = nock('http://api1.test')
      .put('/database/SET/12345/meta:store', {
        id: 'meta:store',
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy',
      })
      .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
    const endpoints = [
      {
        options: {
          uri: 'http://api1.test/database/{type}/{meta.id}/{+payload.id}', // Weird way to verify that the action has the wanted type and meta
        },
        mutation,
      },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'SET_META',
      payload: {
        meta: { lastSyncedAt, status: 'busy' },
        targetService: 'store',
      },
      meta: { ident, id: '12345' },
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should set metadata on service with type', async () => {
    const scope = nock('http://api1.test')
      .put('/database/meta:store:product', {
        id: 'meta:store:product',
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy',
      })
      .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'SET_META',
      payload: {
        type: 'product',
        meta: { lastSyncedAt, status: 'busy' },
        targetService: 'store',
      },
      meta: { ident },
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should set metadata on service with several types',
    async () => {
      const scope = nock('http://api1.test')
        .put('/database/meta:store:entry|article', {
          id: 'meta:store:entry|article',
          lastSyncedAt: lastSyncedAt.toISOString(),
          status: 'busy',
        })
        .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
      const endpoints = [
        {
          options: { uri: 'http://api1.test/database/{+payload.id}' },
          mutation,
        },
      ]
      const great = Integreat.create(defs(endpoints), resources)
      const getService = (type?: string | string[], service?: string) =>
        service === 'store' || type === 'meta'
          ? great.services.store
          : undefined
      const action = {
        type: 'SET_META',
        payload: {
          type: ['entry', 'article'],
          meta: { lastSyncedAt, status: 'busy' },
          targetService: 'store',
        },
        meta: { ident },
      }

      const ret = await setMeta(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal(scope.isDone(), true)
    },
  )

  await t.test('should set metadata on service with metaKey', async () => {
    const scope = nock('http://api1.test')
      .put('/database/meta:store:product:hardware', {
        id: 'meta:store:product:hardware',
        lastSyncedAt: lastSyncedAt.toISOString(),
        status: 'busy',
      })
      .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' }, mutation },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'SET_META',
      payload: {
        type: 'product',
        meta: { lastSyncedAt, status: 'busy' },
        metaKey: 'hardware',
        targetService: 'store',
      },
      meta: { ident },
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should not set metadata on service when no meta type',
    async () => {
      const scope = nock('http://api2.test')
        .put('/database/meta%3Astore')
        .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
      const endpoints = [
        { options: { uri: 'http://api2.test/database/{id}' }, mutation },
      ]
      const great = Integreat.create(defs(endpoints, null), resources)
      const getService = (type?: string | string[], service?: string) =>
        service === 'store' || type === 'meta'
          ? great.services.store
          : undefined
      const action = {
        type: 'SET_META',
        payload: {
          meta: { lastSyncedAt },
          targetService: 'store',
        },
        meta: { ident },
      }
      const expected = {
        status: 'noaction',
        warning:
          "Service 'store' doesn't support metadata (setting was 'undefined')",
        origin: 'handler:SET_META',
      }

      const ret = await setMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test('should set metadata on other service', async () => {
    const scope = nock('http://api3.test')
      .put('/database/meta:entries', {
        id: 'meta:entries',
        lastSyncedAt: lastSyncedAt.toISOString(),
      })
      .reply(200, { okay: true, id: 'meta:entries', rev: '000001' })
    const endpoints = [
      {
        id: 'setMeta',
        options: { uri: 'http://api3.test/database/{+payload.id}' },
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
        meta: { lastSyncedAt },
        targetService: 'entries',
        endpoint: 'setMeta',
      },
      meta: { ident },
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should return status noaction when meta is set to an unknown schema',
    async () => {
      const endpoints = [] as EndpointDef[]
      const great = Integreat.create(defs(endpoints, 'unknown'), resources)
      const getService = (_type?: string | string[], service?: string) =>
        service === 'store' ? great.services.store : undefined
      const action = {
        type: 'SET_META',
        payload: {
          meta: { lastSyncedAt },
          targetService: 'store',
        },
        meta: { ident },
      }
      const expected = {
        status: 'noaction',
        warning:
          "Service 'store' doesn't support metadata (setting was 'unknown')",
        origin: 'handler:SET_META',
      }

      const ret = await setMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test(
    'should refuse setting metadata on service when not authorized',
    async () => {
      const scope = nock('http://api4.test')
        .put('/database/meta%3Astore')
        .reply(200, { okay: true, id: 'meta:store', rev: '000001' })
      const endpoints = [
        { options: { uri: 'http://api4.test/database/{id}' }, mutation },
      ]
      const great = Integreat.create(defs(endpoints), resources)
      const getService = (type?: string | string[], service?: string) =>
        service === 'store' || type === 'meta'
          ? great.services.store
          : undefined
      const action = {
        type: 'SET_META',
        payload: {
          meta: { lastSyncedAt, status: 'busy' },
          targetService: 'store',
        },
      }
      const expected = {
        status: 'noaccess',
        error: "Authentication was refused for type 'meta'",
        reason: 'NO_IDENT',
        origin: 'auth:action',
        data: undefined,
      }

      const ret = await setMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test('should return error for unknown service', async () => {
    const getService = () => undefined
    const action = {
      type: 'SET_META',
      payload: {
        meta: { lastSyncedAt },
        targetService: 'unknown',
      },
      meta: { ident },
    }
    const expected = {
      status: 'error',
      error: "Service 'unknown' doesn't exist",
      origin: 'handler:SET_META',
    }

    const ret = await setMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })
})
