import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import Integreat from '../index.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import resources from '../tests/helpers/resources/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import type { EndpointDef } from '../service/types.js'

import getMeta from './getMeta.js'

// Setup

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
      ...jsonServiceDef,
      meta: meta || undefined,
      endpoints,
    },
    {
      id: 'entries',
      ...jsonServiceDef,
      meta: 'meta',
      endpoints,
    },
  ],
  mutations: {},
})

const lastSyncedAt = new Date()
const metadata = { lastSyncedAt, count: 5, status: 'ready' }

const ident = { id: 'johnf' }

test('getMeta handler', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should get metadata for service', async () => {
    nock('http://api1.test')
      .get('/database/meta:store')
      .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' } },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = () => great.services.store
    const action = {
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
        targetService: 'store',
      },
      meta: { ident },
    }
    const expected = {
      status: 'ok',
      data: { service: 'store', meta: { lastSyncedAt } },
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test('should pass on action type and meta id', async () => {
    nock('http://api1.test')
      .get('/database/GET/12345/meta:store')
      .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
    const endpoints = [
      {
        options: {
          uri: 'http://api1.test/database/{type}/{meta.id}/{+payload.id}', // Weird way to verify that the action has the wanted type and meta
        },
      },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = () => great.services.store
    const action = {
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
        targetService: 'store',
      },
      meta: { ident, id: '12345' },
    }
    const expected = {
      status: 'ok',
      data: { service: 'store', meta: { lastSyncedAt } },
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test('should get several metadata for service', async () => {
    nock('http://api2.test')
      .get('/database/meta:store')
      .reply(200, { id: 'meta:store', ...metadata })
    const endpoints = [
      {
        id: 'getMeta',
        options: { uri: 'http://api2.test/database/{+payload.id}' },
      },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'GET_META',
      payload: {
        keys: ['lastSyncedAt', 'count'],
        targetService: 'store',
        endpoint: 'getMeta',
      },
      meta: { ident },
    }
    const expected = { service: 'store', meta: { lastSyncedAt, count: 5 } }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.data, expected)
  })

  await t.test('should get all metadata for service', async () => {
    nock('http://api3.test')
      .get('/database/meta:store')
      .reply(200, { id: 'meta:store', ...metadata })
    const endpoints = [
      {
        id: 'getMeta',
        options: { uri: 'http://api3.test/database/{+payload.id}' },
      },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'GET_META',
      payload: { targetService: 'store' },
      meta: { ident },
    }
    const expected = {
      service: 'store',
      meta: { lastSyncedAt, count: 5, status: 'ready' },
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.data, expected)
  })

  await t.test('should get metadata for service with type', async () => {
    nock('http://api1.test')
      .get('/database/meta:store:entry')
      .reply(200, { id: 'meta:store:entry', _rev: '000001', ...metadata })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' } },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = () => great.services.store
    const action = {
      type: 'GET_META',
      payload: {
        type: 'entry',
        keys: 'lastSyncedAt',
        targetService: 'store',
      },
      meta: { ident },
    }
    const expected = {
      status: 'ok',
      data: { service: 'store', meta: { lastSyncedAt } },
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test(
    'should get metadata for service with several types',
    async () => {
      nock('http://api1.test')
        .get('/database/meta:store:entry|article')
        .reply(200, {
          id: 'meta:store:entry|article',
          _rev: '000001',
          ...metadata,
        })
      const endpoints = [
        { options: { uri: 'http://api1.test/database/{+payload.id}' } },
      ]
      const great = Integreat.create(defs(endpoints), resources)
      const getService = () => great.services.store
      const action = {
        type: 'GET_META',
        payload: {
          type: ['entry', 'article'],
          keys: 'lastSyncedAt',
          targetService: 'store',
        },
        meta: { ident },
      }
      const expected = {
        status: 'ok',
        data: { service: 'store', meta: { lastSyncedAt } },
      }

      const ret = await getMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test('should get metadata for service with metaKey', async () => {
    nock('http://api1.test')
      .get('/database/meta:store:product:hardware')
      .reply(200, {
        id: 'meta:store:product:hardware',
        _rev: '000001',
        ...metadata,
      })
    const endpoints = [
      { options: { uri: 'http://api1.test/database/{+payload.id}' } },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = () => great.services.store
    const action = {
      type: 'GET_META',
      payload: {
        type: 'product',
        keys: 'lastSyncedAt',
        metaKey: 'hardware',
        targetService: 'store',
      },
      meta: { ident },
    }
    const expected = {
      status: 'ok',
      data: { service: 'store', meta: { lastSyncedAt } },
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test(
    'should return null for metadata when not set on service',
    async () => {
      nock('http://api4.test')
        .get('/database/meta:store')
        .reply(200, { id: 'meta:store', _rev: '000001', type: 'meta' })
      const endpoints = [
        {
          id: 'getMeta',
          options: { uri: 'http://api4.test/database/{+payload.id}' },
        },
      ]
      const great = Integreat.create(defs(endpoints), resources)
      const getService = (type?: string | string[], service?: string) =>
        service === 'store' || type === 'meta'
          ? great.services.store
          : undefined
      const action = {
        type: 'GET_META',
        payload: {
          keys: 'lastSyncedAt',
          targetService: 'store',
        },
        meta: { ident },
      }
      const expected = { service: 'store', meta: { lastSyncedAt: null } }

      const ret = await getMeta(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.deepEqual(ret.data, expected)
    },
  )

  await t.test('should return reply from service when not ok', async () => {
    nock('http://api5.test').get('/database/meta:store').reply(404)
    const endpoints = [
      {
        id: 'getMeta',
        options: { uri: 'http://api5.test/database/{+payload.id}' },
      },
    ]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
        targetService: 'store',
      },
      meta: { ident },
    }
    const expected = {
      status: 'notfound',
      error: 'Could not find the url http://api5.test/database/meta:store',
      origin: 'service:store',
      data: undefined,
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test(
    'should return empty object as meta when no data from service',
    async () => {
      nock('http://api5.test').get('/database/meta:store').reply(200, '')
      const endpoints = [
        {
          id: 'getMeta',
          options: { uri: 'http://api5.test/database/{+payload.id}' },
        },
      ]
      const great = Integreat.create(defs(endpoints), resources)
      const getService = (type?: string | string[], service?: string) =>
        service === 'store' || type === 'meta'
          ? great.services.store
          : undefined
      const action = {
        type: 'GET_META',
        payload: {
          keys: 'lastSyncedAt',
          targetService: 'store',
        },
        meta: { ident },
      }
      const expectedData = { meta: {}, service: 'store' }

      const ret = await getMeta(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.deepEqual(ret.data, expectedData)
    },
  )

  await t.test(
    'should return noaction when when no meta type is set',
    async () => {
      const scope = nock('http://api6.test')
        .get('/database/meta:store')
        .reply(200, {})
      const endpoints = [
        {
          id: 'getMeta',
          options: { uri: 'http://api6.test/database/{+id}' },
        },
      ]
      const great = Integreat.create(defs(endpoints, null), resources)
      const getService = (_type?: string | string[], service?: string) =>
        service === 'store' ? great.services.store : undefined
      const action = {
        type: 'GET_META',
        payload: {
          keys: 'lastSyncedAt',
          targetService: 'store',
        },
        meta: { ident },
      }
      const expected = {
        status: 'noaction',
        warning:
          "Service 'store' doesn't support metadata (setting was 'undefined')",
        origin: 'handler:GET_META',
      }

      const ret = await getMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test('should get metadata from other service', async () => {
    nock('http://api7.test')
      .get('/database/meta:entries')
      .reply(200, { id: 'entries', _rev: '000001', lastSyncedAt })
    const endpoints = [
      {
        id: 'getMeta',
        options: { uri: 'http://api7.test/database/{+payload.id}' },
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
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
        targetService: 'entries',
      },
      meta: { ident },
    }
    const expected = { service: 'entries', meta: { lastSyncedAt } }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.data, expected)
  })

  await t.test(
    'should return noaction when meta is set to an unknown type',
    async () => {
      const endpoints = [] as EndpointDef[]
      const great = Integreat.create(defs(endpoints, 'unknown'), resources)
      const getService = (_type?: string | string[], service?: string) =>
        service === 'entries' ? great.services.store : undefined
      const action = {
        type: 'GET_META',
        payload: {
          keys: 'lastSyncedAt',
          targetService: 'entries',
        },
        meta: { ident },
      }
      const expected = {
        status: 'noaction',
        warning:
          "Service 'store' doesn't support metadata (setting was 'unknown')",
        origin: 'handler:GET_META',
      }

      const ret = await getMeta(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test('should return error for unknown service', async () => {
    const getService = () => undefined
    const action = {
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
        targetService: 'unknown',
      },
      meta: { ident },
    }
    const expected = {
      status: 'error',
      error: "Service 'unknown' doesn't exist",
      origin: 'handler:GET_META',
    }

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test('should respond with noaccess when not authorized', async () => {
    nock('http://api8.test')
      .get('/database/meta:store')
      .reply(200, { id: 'meta:store', _rev: '000001', ...metadata })
    const endpoints = [{ options: { uri: 'http://api8.test/database/{id}' } }]
    const great = Integreat.create(defs(endpoints), resources)
    const getService = (type?: string | string[], service?: string) =>
      service === 'store' || type === 'meta' ? great.services.store : undefined
    const action = {
      type: 'GET_META',
      payload: {
        keys: 'lastSyncedAt',
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

    const ret = await getMeta(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })
})
