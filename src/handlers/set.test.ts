import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import mapTransform from 'map-transform'
import Service from '../service/Service.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import Schema from '../schema/Schema.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'
import { IdentType, type TypedData } from '../types.js'
import type { ValidateObject } from '../types.js'

import set from './set.js'

// Setup

const schemas = new Map()
schemas.set(
  'entry',
  new Schema({
    id: 'entry',
    shape: {
      title: { $type: 'string', default: 'A title' },
      one: 'integer',
    },
    access: { allow: 'auth' },
  }),
)
schemas.set(
  'account',
  new Schema({
    id: 'account',
    shape: {
      name: 'string',
      posts: 'entry',
    },
    access: { identFromField: 'id' },
  }),
)
const pipelines = {
  entry: [
    {
      $iterate: true,
      id: 'id',
      title: 'header',
    },
    { $cast: 'entry' },
  ],
  account: [
    {
      $iterate: true,
      id: 'id',
      name: 'name',
      posts: 'entries',
    },
    { $cast: 'account' },
  ],
}

const mapOptions = createMapOptions(schemas, pipelines)

const typeMappingFromServiceId = (serviceId: string) =>
  serviceId === 'accounts' ? 'account' : 'entry'

const setupService = (
  uri: string,
  id = 'entries',
  method = 'POST',
  validate?: ValidateObject[],
) => {
  return new Service(
    {
      id,
      ...jsonServiceDef,
      endpoints: [
        {
          validate,
          mutation: [
            {
              $direction: 'to',
              payload: {
                id: 'payload.id',
                type: 'payload.type',
                typefolder: 'payload.typefolder',
                data: [
                  'payload.data.docs[]',
                  { $apply: typeMappingFromServiceId(id) },
                ],
              },
            },
            {
              $direction: 'from',
              response: 'response',
              'response.data': [
                'response.data',
                { $apply: typeMappingFromServiceId(id) },
              ],
            },
          ],
          options: { uri, method },
        },
        {
          id: 'other',
          options: { uri: 'http://api1.test/other/_bulk_docs' },
          mutation: { data: ['data', { $apply: 'entry' }] },
        },
      ],
    },
    {
      schemas,
      mapTransform,
      mapOptions,
    },
  )
}

test('set handler', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should mutate and set items to service', async () => {
    const scope = nock('http://api1.test')
      .post('/database/_bulk_docs', {
        docs: [
          { id: 'ent1', header: 'Entry 1' },
          { id: 'ent2', header: 'Entry 2' },
        ],
      })
      .reply(201, [{ ok: true }, { ok: true }])
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        data: [
          { $type: 'entry', id: 'ent1', title: 'Entry 1' },
          { $type: 'entry', id: 'ent2', title: 'Entry 2' },
        ],
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api1.test/database/_bulk_docs')
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? src : undefined

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.headers, { 'content-type': 'application/json' })
    assert.equal(Array.isArray(ret.data), true)
    assert.equal((ret.data as unknown[]).length, 2)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should mutate and set one item to service', async () => {
    const scope = nock('http://api4.test')
      .post('/database/_bulk_docs', {
        docs: [{ id: 'ent1', header: 'A title' }],
      })
      .reply(201, [{ ok: true }])
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        data: [{ $type: 'entry', id: 'ent1' }],
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api4.test/database/_bulk_docs')
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should mutate and set with id to service', async () => {
    const scope = nock('http://api11.test')
      .post('/database/entry:ent1')
      .reply(201, [{ ok: true }])
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        id: 'ent1',
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService(
      'http://api11.test/database/{payload.type}:{payload.id}',
    )
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should mutate and set with member endpoint for single item',
    async () => {
      const scope = nock('http://api12.test')
        .post('/database/entry:ent1')
        .reply(201, { ok: true })
      const action = {
        type: 'SET',
        payload: {
          type: 'entry',
          data: { id: 'ent1', $type: 'entry' },
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const src = new Service(
        {
          id: 'entries',
          ...jsonServiceDef,
          endpoints: [
            {
              match: { type: 'entry', scope: 'member' },
              mutation: [
                {
                  $direction: 'to',
                  $flip: true,
                  payload: {
                    $modify: 'payload',
                    'data.doc': ['payload.data', { $apply: 'entry' }],
                  },
                },
              ],
              options: {
                uri: 'http://api12.test/database/{payload.type}:{payload.id}',
                method: 'POST',
              },
              allowRawResponse: true,
            },
          ],
        },
        {
          schemas,
          mapTransform,
          mapOptions,
        },
      )
      const getService = () => src

      const ret = await set(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal(scope.isDone(), true)
    },
  )

  await t.test('should infer service id from type', async () => {
    const scope = nock('http://api2.test')
      .post('/database/_bulk_docs')
      .reply(201, [{ ok: true }, { ok: true }])
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        data: [
          { id: 'ent1', $type: 'entry' },
          { id: 'ent2', $type: 'entry' },
        ],
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api2.test/database/_bulk_docs')
    const getService = (type?: string | string[], _service?: string) =>
      type === 'entry' ? src : undefined

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should set to specified endpoint', async () => {
    const scope = nock('http://api1.test')
      .put('/other/_bulk_docs')
      .reply(201, [{ ok: true }])
    const action = {
      type: 'SET',
      payload: {
        data: [{ id: 'ent1', $type: 'entry' }],
        targetService: 'entries',
        endpoint: 'other',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api1.test/database/_bulk_docs')
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should set to uri with payload params', async () => {
    const scope = nock('http://api3.test')
      .post('/entries/_bulk_docs')
      .reply(201, [{ ok: true }])
    const action = {
      type: 'SET',
      payload: {
        data: [{ id: 'ent1', $type: 'entry' }],
        typefolder: 'entries',
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api3.test/{payload.typefolder}/_bulk_docs')
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should return failResponse when validation fails', async () => {
    const scope = nock('http://api5.test')
      .post('/database/_bulk_docs', { docs: [] })
      .reply(201, [])
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        // No data
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService(
      'http://api5.test/database/_bulk_docs',
      undefined,
      undefined,
      [
        {
          condition: 'payload.data',
          failResponse: { status: 'error', error: 'We need data!' },
        },
      ],
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? src : undefined
    const expected = {
      status: 'error',
      error: 'We need data!',
      data: undefined,
      origin: 'validate:service:entries:endpoint',
    }

    const ret = await set(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
    assert.equal(scope.isDone(), false)
  })

  await t.test('should authorize before running validation', async () => {
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        // No data
        targetService: 'entries',
      },
      meta: {}, // No identity
    }
    const src = setupService(
      'http://api5.test/database/_bulk_docs',
      undefined,
      undefined,
      [
        {
          condition: 'payload.data',
          failResponse: { status: 'error', error: 'We need data!' },
        },
      ],
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? src : undefined

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'noaccess', ret.error) // We'll get this status when authorization is run before validation
  })

  await t.test('should return error when service fails', async () => {
    nock('http://api7.test').post('/database/_bulk_docs').reply(404)
    const action = {
      type: 'SET',
      payload: {
        data: [{ id: 'ent1', $type: 'entry' }],
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api7.test/database/_bulk_docs')
    const getService = () => src
    const expected = {
      status: 'notfound',
      error: 'Could not find the url http://api7.test/database/_bulk_docs',
      origin: 'service:entries',
      data: undefined,
    }

    const ret = await set(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
    assert.equal(!!ret.data, false)
  })

  await t.test(
    'should return error when no service exists for a type',
    async () => {
      const getService = () => undefined
      const action = {
        type: 'SET',
        payload: {
          type: 'entry',
          data: { id: 'ent1', $type: 'entry' },
        },
        meta: { ident: { id: 'johnf' } },
      }
      const expected = {
        status: 'error',
        error: "No service exists for type 'entry'",
        origin: 'handler:SET',
      }

      const ret = await set(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test('should get type from data $type', async () => {
    const getService = () => undefined
    const action = {
      type: 'SET',
      payload: {
        data: { id: 'ent1', $type: 'entry' },
      },
      meta: { ident: { id: 'johnf' } },
    }
    const expected = {
      status: 'error',
      error: "No service exists for type 'entry'",
      origin: 'handler:SET',
    }

    const ret = await set(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test(
    'should return error when specified service does not exist',
    async () => {
      const getService = () => undefined
      const action = {
        type: 'SET',
        payload: {
          data: { id: 'ent1', $type: 'entry' },
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const expected = {
        status: 'error',
        error: "Service with id 'entries' does not exist",
        origin: 'handler:SET',
      }

      const ret = await set(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test('should authenticate items', async () => {
    const scope = nock('http://api6.test')
      .post('/database/_bulk_docs', {
        docs: [{ id: 'johnf', name: 'John F.' }],
      })
      .reply(201, [{ ok: true }])
    const action = {
      type: 'SET',
      payload: {
        type: 'account',
        data: [
          { id: 'johnf', $type: 'account', name: 'John F.' },
          { id: 'betty', $type: 'account', name: 'Betty' },
        ],
        targetService: 'accounts',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api6.test/database/_bulk_docs', 'accounts')
    const getService = (_type?: string | string[], service?: string) =>
      service === 'accounts' ? src : undefined

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should return empty response from service', async () => {
    nock('http://api8.test').post('/database/_bulk_docs').reply(201)
    const src = setupService('http://api8.test/database/_bulk_docs', 'accounts')
    const getService = (_type?: string | string[], service?: string) =>
      service === 'accounts' ? src : undefined
    const action = {
      type: 'SET',
      payload: {
        data: [
          { id: 'johnf', $type: 'account', name: 'John F.' },
          { id: 'betty', $type: 'account', name: 'Betty' },
        ],
        targetService: 'accounts',
      },
      meta: { ident: { id: 'johnf' } },
    }

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(ret.data, undefined)
  })

  await t.test('should mutate response data', async () => {
    nock('http://api9.test')
      .post('/database/_bulk_docs')
      .reply(201, [
        { id: 'johnf', type: 'account', name: 'John Fjon', entries: [] },
      ])
    const action = {
      type: 'SET',
      payload: {
        data: [
          {
            $type: 'account',
            name: 'John F.',
            posts: [{ id: 'ent1', $ref: 'entry' }],
          },
        ],
        targetService: 'accounts',
      },
      meta: { ident: { id: 'root', type: IdentType.Root } },
    }
    const src = setupService('http://api9.test/database/_bulk_docs', 'accounts')
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data.length, 1)
    assert.equal(data[0].$type, 'account')
    assert.equal(data[0].id, 'johnf')
    assert.equal(data[0].name, 'John Fjon')
  })

  await t.test('should mutate non-array response data', async () => {
    nock('http://api10.test').post('/database/_bulk_docs').reply(201, {
      id: 'johnf',
      type: 'account',
      name: 'John Fjon',
      entries: [],
    })
    const action = {
      type: 'SET',
      payload: {
        data: { $type: 'account', name: 'John F.' },
        targetService: 'accounts',
      },
      meta: { ident: { id: 'root', type: IdentType.Root } },
    }
    const src = setupService(
      'http://api10.test/database/_bulk_docs',
      'accounts',
    )
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData
    assert.equal(Array.isArray(data), false)
    assert.equal(data.$type, 'account')
    assert.equal(data.id, 'johnf')
    assert.equal(data.name, 'John Fjon')
  })

  await t.test('should allow null as request data', async () => {
    const scope = nock('http://api1.test')
      .post('/database/_bulk_docs', '{"docs":[]}')
      .reply(201, [{ ok: true }, { ok: true }])
    const action = {
      type: 'SET',
      payload: {
        data: null,
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const src = setupService('http://api1.test/database/_bulk_docs')
    const getService = () => src

    const ret = await set(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should return badrequest when no endpoint matches',
    async () => {
      const action = {
        type: 'SET',
        payload: {
          type: 'entry',
          data: [
            { $type: 'entry', id: 'ent1', title: 'Entry 1' },
            { $type: 'entry', id: 'ent2', title: 'Entry 2' },
          ],
          endpoint: 'unknown',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const src = setupService('http://api1.test/database/_bulk_docs')
      const getService = (_type?: string | string[], service?: string) =>
        service === 'entries' ? src : undefined
      const expected = {
        status: 'badrequest',
        error: "No endpoint matching SET request to service 'entries'.",
        origin: 'handler:SET',
      }

      const ret = await set(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )
})
