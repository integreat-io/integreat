import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import nock from 'nock'
import mapTransform from 'map-transform'
import Service from '../service/Service.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import Schema from '../schema/Schema.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { Action, TypedData } from '../types.js'

import get from './get.js'

// Setup

const schemas = new Map()
schemas.set(
  'entry',
  new Schema({
    id: 'entry',
    shape: {
      title: 'string',
      byline: { $type: 'string', default: 'Somebody' },
      source: 'source',
      createdAt: 'date',
      updatedAt: 'date',
    },
    access: 'auth',
  }),
)
schemas.set(
  'account',
  new Schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
)
schemas.set(
  'source',
  new Schema({
    id: 'source',
    shape: {
      name: 'string',
    },
    access: 'auth',
  }),
)

const pipelines = {
  entry: [
    {
      $iterate: true,
      id: 'id',
      title: 'headline',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      source: '^payload.source',
    },
    { $cast: 'entry' },
  ],
  account: [
    {
      $iterate: true,
      id: 'id',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    { $cast: 'account' },
  ],
}

const ms = () => () => (date: unknown) =>
  date instanceof Date ? date.getTime() : undefined

const mapOptions = createMapOptions(schemas, pipelines, { ms })

const setupService = (
  uri: string,
  match = {},
  { id = 'entries' } = {},
  includeOther = false,
) =>
  new Service(
    {
      id,
      ...jsonServiceDef,
      endpoints: [
        {
          match,
          validate: [
            {
              condition: 'payload.source',
              failResponse: {
                status: 'badrequest',
                error: 'We need a source!',
              },
            },
          ],
          mutation: [
            {
              $direction: 'to',
              $flip: true,
              payload: {
                $modify: 'payload',
                updatedAfter: ['payload.updatedAfter', { $transform: 'ms' }],
              },
            },
            {
              $direction: 'from',
              response: {
                $modify: 'response',
                data: [
                  'response.data',
                  { $apply: id === 'accounts' ? 'account' : 'entry' },
                ],
              },
            },
          ],
          options: { uri },
        },
        ...(includeOther
          ? [
              {
                id: 'other',
                mutation: {
                  response: {
                    $modify: 'response',
                    data: ['response.data', { $apply: 'entry' }],
                  },
                },
                options: { uri: 'http://api5.test/other' },
              },
            ]
          : []),
      ],
    },
    { schemas, mapTransform, mapOptions },
  )

test('get handler', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should get items from service', async () => {
    const date = new Date()
    const scope = nock('http://api1.test')
      .get('/database')
      .query({ since: date.getTime() })
      .reply(200, [
        {
          id: 'ent1',
          type: 'entry',
          headline: 'Entry 1',
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
        },
      ])
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        source: 'thenews',
        targetService: 'entries',
        updatedAfter: date,
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService(
      'http://api1.test/database?since={payload.updatedAfter}',
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? svc : undefined
    const expected = {
      status: 'ok',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'Entry 1',
          byline: 'Somebody',
          createdAt: date,
          updatedAt: date,
          source: { id: 'thenews', $ref: 'source' },
        },
      ],
      headers: {
        'content-type': 'application/json',
      },
    }

    const ret = await get(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should get item by id from service', async () => {
    nock('http://api1.test')
      .get('/database/entry:ent1')
      .reply(200, { id: 'ent1', type: 'entry' })
    const action = {
      type: 'GET',
      payload: {
        id: 'ent1',
        type: 'entry',
        source: 'thenews',
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService(
      'http://api1.test/database/{payload.type}:{payload.id}',
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? svc : undefined

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal((ret.data as TypedData).id, 'ent1')
  })

  await t.test(
    'should get items by id array from service from member_s_ endpoint',
    async () => {
      nock('http://api12.test')
        .get('/entries')
        .query({ id: 'ent1,ent2' })
        .reply(200, [
          { id: 'ent1', type: 'entry' },
          { id: 'ent2', type: 'entry' },
        ])
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1', 'ent2'],
          type: 'entry',
          source: 'thenews',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api12.test/entries?id={payload.id}', {
        scope: 'members',
        id: 'membersEndpoint',
      })
      const getService = () => svc

      const ret = await get(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal(Array.isArray(ret.data), true)
      const data = ret.data as TypedData[]
      assert.equal(data.length, 2)
      assert.equal(data[0].id, 'ent1')
      assert.equal(data[1].id, 'ent2')
    },
  )

  await t.test(
    'should get items by id array from member endpoints',
    async () => {
      const scope = nock('http://api6.test')
        .get('/entries/ent1')
        .reply(200, { id: 'ent1', type: 'entry' })
        .get('/entries/ent2')
        .reply(200, { id: 'ent2', type: 'entry' })
        .get('/entries/ent3')
        .reply(404, undefined)
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1', 'ent2', 'ent3'],
          type: 'entry',
          source: 'thenews',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api6.test/entries/{payload.id}', {
        scope: 'member',
      })
      const getService = (_type?: string | string[], service?: string) =>
        service === 'entries' ? svc : undefined

      const ret = await get(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal(Array.isArray(ret.data), true)
      const data = ret.data as (TypedData | undefined)[]
      assert.equal(data.length, 3)
      assert.equal(data[0]?.id, 'ent1')
      assert.equal(data[1]?.id, 'ent2')
      assert.equal(data[2], undefined)
      assert.equal(scope.isDone(), true)
    },
  )

  await t.test('should pass on ident when getting from id array', async () => {
    const action = {
      type: 'GET',
      payload: {
        id: ['ent1', 'ent2'],
        type: 'entry',
        source: 'thenews',
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService('http://api11.test/entries/{id}', {
      scope: 'member',
    })
    const sendStub = sinon
      .stub(svc, 'send')
      .callsFake(async (_action: Action) => ({
        status: 'ok',
        data: [{ id: 'ent1', $type: 'entry' }],
      }))
    const getService = () => svc

    await get(action, { ...handlerResources, getService })

    assert.equal(sendStub.callCount, 2)
    const action1 = sendStub.args[0][0]
    assert.deepEqual(action1.meta?.ident, { id: 'johnf' })
  })

  await t.test(
    'should return noaction when members action has empty id array',
    async () => {
      const action = {
        type: 'GET',
        payload: {
          id: [],
          type: 'entry',
          source: 'thenews',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api13.test/entries?id={payload.id}', {
        scope: 'members',
        id: 'membersEndpoint',
      })
      const getService = () => svc
      const expected = {
        status: 'noaction',
        warning: 'GET action was dispatched with empty array of ids',
        origin: 'handler:GET',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test(
    'should return error when one or more requests for individual ids fails',
    async () => {
      nock('http://api8.test')
        .get('/entries/ent1')
        .reply(200, { id: 'ent1', type: 'entry' })
        .get('/entries/ent2')
        .reply(500)
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1', 'ent2'],
          type: 'entry',
          source: 'thenews',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api8.test/entries/{payload.id}', {
        scope: 'member',
      })
      const getService = () => svc
      const expected = {
        status: 'error',
        error:
          'One or more of the requests for ids ent1,ent2 failed with the following error(s): Server returned 500 for http://api8.test/entries/ent2',
        data: undefined,
        origin: 'service:entries',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test(
    'should get item by id from service when id is array of one',
    async () => {
      nock('http://api7.test')
        .get('/entries/ent1')
        .reply(200, { id: 'ent1', type: 'entry' })
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1'],
          type: 'entry',
          source: 'thenews',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api7.test/entries/{payload.id}', {
        scope: 'member',
      })
      const getService = () => svc

      const ret = await get(action, { ...handlerResources, getService })

      assert.equal(ret.status, 'ok', ret.error)
      assert.equal((ret.data as TypedData).id, 'ent1')
    },
  )

  await t.test('should get default values from type', async () => {
    nock('http://api1.test')
      .get('/database')
      .reply(200, [{ id: 'ent1', type: 'entry' }])
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        source: 'thenews',
        targetService: 'entries',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService('http://api1.test/database')
    const getService = () => svc

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal((ret.data as TypedData[])[0].byline, 'Somebody')
  })

  await t.test('should infer service id from type', async () => {
    nock('http://api1.test')
      .get('/database')
      .reply(200, [{ id: 'ent1', type: 'entry' }])
    const action = {
      type: 'GET',
      payload: { type: 'entry', source: 'thenews' },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService('http://api1.test/database')
    const getService = (type?: string | string[], _service?: string) =>
      type === 'entry' ? svc : undefined

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok')
    assert.equal((ret.data as TypedData[])[0].id, 'ent1')
  })

  await t.test('should get from other endpoint', async () => {
    nock('http://api5.test')
      .get('/other')
      .reply(200, [{ id: 'ent1', type: 'entry' }])
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        endpoint: 'other',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService(
      'http://api5.test/database',
      undefined,
      undefined,
      true,
    )
    const getService = () => svc

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal((ret.data as TypedData[])[0].id, 'ent1')
  })

  await t.test('should return error on not found', async () => {
    nock('http://api3.test').get('/unknown').reply(404)
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        targetService: 'entries',
        source: 'thenews',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService('http://api3.test/unknown')
    const getService = () => svc
    const expected = {
      status: 'notfound',
      error: 'Could not find the url http://api3.test/unknown',
      origin: 'service:entries',
      data: undefined,
    }

    const ret = await get(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test('should return failResponse when validation fails', async () => {
    const date = new Date()
    const scope = nock('http://api10.test')
      .get('/database')
      .query({ since: date.getTime() })
      .reply(200, [
        {
          id: 'ent1',
          type: 'entry',
          headline: 'Entry 1',
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
        },
      ])
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        // No source
        targetService: 'entries',
        updatedAfter: date,
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService(
      'http://api10.test/database?since={payload.updatedAfter}',
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? svc : undefined
    const expected = {
      status: 'badrequest',
      error: 'We need a source!',
      data: undefined,
      origin: 'validate:service:entries:endpoint',
    }

    const ret = await get(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
    assert.equal(scope.isDone(), false)
  })

  await t.test(
    'should return failResponse when validation fails for member_s_ endpoint',
    async () => {
      const scope = nock('http://api14.test')
        .get('/entries')
        .query({ id: 'ent1,ent2' })
        .reply(200, [
          { id: 'ent1', type: 'entry' },
          { id: 'ent2', type: 'entry' },
        ])
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1', 'ent2'],
          type: 'entry',
          // No source
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api14.test/entries?id={payload.id}', {
        scope: 'members',
        id: 'membersEndpoint',
      })
      const getService = () => svc
      const expected = {
        status: 'badrequest',
        error: 'We need a source!',
        data: undefined,
        origin: 'validate:service:entries:endpoint',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test(
    'should return failResponse when validation fails for individual member endpoints',
    async () => {
      const scope = nock('http://api15.test')
        .get('/entries/ent1')
        .reply(200, { id: 'ent1', type: 'entry' })
        .get('/entries/ent2')
        .reply(200, { id: 'ent2', type: 'entry' })
        .get('/entries/ent3')
        .reply(404, undefined)
      const action = {
        type: 'GET',
        payload: {
          id: ['ent1', 'ent2', 'ent3'],
          type: 'entry',
          // No source
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api15.test/entries/{payload.id}', {
        scope: 'member',
      })
      const getService = (_type?: string | string[], service?: string) =>
        service === 'entries' ? svc : undefined
      const expected = {
        status: 'badrequest',
        error:
          'One or more of the requests for ids ent1,ent2,ent3 failed with the following error(s): [badrequest] We need a source!',
        origin: 'validate:service:entries:endpoint',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test('should authorize before validation', async () => {
    const date = new Date()
    nock('http://api10.test')
      .get('/database')
      .query({ since: date.getTime() })
      .reply(200, [
        {
          id: 'ent1',
          type: 'entry',
          headline: 'Entry 1',
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
        },
      ])
    const action = {
      type: 'GET',
      payload: {
        type: 'entry',
        // No source
        targetService: 'entries',
        updatedAfter: date,
      },
      meta: {}, // No ident
    }
    const svc = setupService(
      'http://api10.test/database?since={payload.updatedAfter}',
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'entries' ? svc : undefined

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'noaccess', ret.error) // We'll get this status when authorization is run before validation
  })

  await t.test(
    'should return error when no service exists for type',
    async () => {
      const action = {
        type: 'GET',
        payload: { type: 'entry' },
        meta: { ident: { id: 'johnf' } },
      }
      const getService = () => undefined
      const expected = {
        status: 'error',
        error: "No service exists for type 'entry'",
        origin: 'handler:GET',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test(
    'should return error when specified service does not exist',
    async () => {
      const action = {
        type: 'GET',
        payload: { type: 'entry', targetService: 'entries' },
        meta: { ident: { id: 'johnf' } },
      }
      const getService = () => undefined
      const expected = {
        status: 'error',
        error: "Service with id 'entries' does not exist",
        origin: 'handler:GET',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )

  await t.test('should get only authorized items', async () => {
    nock('http://api9.test')
      .get('/database')
      .reply(200, [
        {
          id: 'johnf',
          type: 'account',
          name: 'John F.',
        },
        {
          id: 'betty',
          type: 'account',
          name: 'Betty K.',
        },
      ])
    const action = {
      type: 'GET',
      payload: {
        type: 'account',
        source: 'thenews',
        targetService: 'accounts',
      },
      meta: { ident: { id: 'johnf' } },
    }
    const svc = setupService(
      'http://api9.test/database',
      {},
      { id: 'accounts' },
    )
    const getService = (_type?: string | string[], service?: string) =>
      service === 'accounts' ? svc : undefined
    const expectedData = [
      {
        $type: 'account',
        id: 'johnf',
        name: 'John F.',
      },
    ]

    const ret = await get(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data
    assert.deepEqual(data, expectedData)
  })

  await t.test(
    'should return badrequest when no endpoint matches',
    async () => {
      const action = {
        type: 'GET',
        payload: {
          type: 'entry',
          source: 'thenews',
          endpoint: 'unknown',
          targetService: 'entries',
        },
        meta: { ident: { id: 'johnf' } },
      }
      const svc = setupService('http://api1.test/database')
      const getService = (_type?: string | string[], service?: string) =>
        service === 'entries' ? svc : undefined
      const expected = {
        status: 'badrequest',
        error: "No endpoint matching GET request to service 'entries'.",
        origin: 'handler:GET',
      }

      const ret = await get(action, { ...handlerResources, getService })

      assert.deepEqual(ret, expected)
    },
  )
})
