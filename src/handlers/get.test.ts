import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import createService from '../service/index.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import schema from '../schema/index.js'
import transformers from '../transformers/builtIns/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { Action, TypedData } from '../types.js'

import get from './get.js'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    shape: {
      title: 'string',
      byline: { $type: 'string', default: 'Somebody' },
      source: 'source',
      createdAt: 'date',
      updatedAt: 'date',
    },
  }),
  account: schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
  source: schema({
    id: 'source',
    shape: {
      name: 'string',
    },
    access: 'auth',
  }),
}

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
    { $apply: 'cast_entry' },
  ],
  account: [
    {
      $iterate: true,
      id: 'id',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    { $apply: 'cast_account' },
  ],
  ['cast_entry']: schemas.entry.mapping,
  ['cast_account']: schemas.account.mapping,
  ['cast_source']: schemas.source.mapping,
}

const ms = () => () => (date: unknown) =>
  date instanceof Date ? date.getTime() : undefined

const mapOptions = createMapOptions(schemas, pipelines, {
  ...transformers,
  ms,
})

const setupService = (uri: string, match = {}, { id = 'entries' } = {}) =>
  createService({ schemas, mapOptions })({
    id,
    ...jsonServiceDef,
    endpoints: [
      {
        match,
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
    ],
  })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get items from service', async (t) => {
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
    'http://api1.test/database?since={payload.updatedAfter}'
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

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should get item by id from service', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const svc = setupService(
    'http://api1.test/database/{payload.type}:{payload.id}'
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? svc : undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData).id, 'ent1')
})

test('should get items by id array from service from member_s_ endpoint', async (t) => {
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
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api12.test/entries?id={payload.id}', {
    scope: 'members',
    id: 'membersEndpoint',
  })
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  t.is(data[0].id, 'ent1')
  t.is(data[1].id, 'ent2')
})

test('should get items by id array from member endpoints', async (t) => {
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
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api6.test/entries/{payload.id}', {
    scope: 'member',
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? svc : undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  const data = ret.data as (TypedData | undefined)[]
  t.is(data.length, 3)
  t.is(data[0]?.id, 'ent1')
  t.is(data[1]?.id, 'ent2')
  t.is(data[2], undefined)
  t.true(scope.isDone())
})

test('should pass on ident when getting from id array', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1', 'ent2'],
      type: 'entry',
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

  t.is(sendStub.callCount, 2)
  const action1 = sendStub.args[0][0]
  t.truthy(action1)
  t.deepEqual(action1.meta?.ident, { id: 'johnf' })
})

test('should return noaction when members action has empty id array', async (t) => {
  const action = {
    type: 'GET',
    payload: {
      id: [],
      type: 'entry',
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api13.test/entries?id={payload.id}', {
    scope: 'members',
    id: 'membersEndpoint',
  })
  const getService = () => svc
  const expected = {
    status: 'noaction',
    error: 'GET action was dispatched with empty array of ids',
    origin: 'handler:GET',
  }

  const ret = await get(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return error when one or more requests for individual ids fails', async (t) => {
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
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api8.test/entries/{id}', { scope: 'member' })
  const getService = () => svc
  const expected = {
    status: 'error',
    error: 'One or more of the requests for ids ent1,ent2 failed.',
    origin: 'handler:GET',
  }

  const ret = await get(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should get item by id from service when id is array of one', async (t) => {
  nock('http://api7.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1'],
      type: 'entry',
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api7.test/entries/{payload.id}', {
    scope: 'member',
  })
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData).id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      targetService: 'entries',
    },
  }
  const svc = setupService('http://api1.test/database')
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is((ret.data as TypedData[])[0].byline, 'Somebody')
})

test('should infer service id from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = { type: 'GET', payload: { type: 'entry' } }
  const svc = setupService('http://api1.test/database')
  const getService = (type?: string | string[], _service?: string) =>
    type === 'entry' ? svc : undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok')
  t.is((ret.data as TypedData[])[0].id, 'ent1')
})

test('should get from other endpoint', async (t) => {
  nock('http://api5.test')
    .get('/other')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      endpoint: 'other',
    },
  }
  const svc = setupService('http://api5.test/database')
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.is((ret.data as TypedData[])[0].id, 'ent1')
})

test('should return error on not found', async (t) => {
  nock('http://api3.test').get('/unknown').reply(404)
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      targetService: 'entries',
    },
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

  t.deepEqual(ret, expected)
})

test('should return error when no service exists for type', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const getService = () => undefined
  const expected = {
    status: 'error',
    error: "No service exists for type 'entry'",
    origin: 'handler:GET',
  }

  const ret = await get(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return error when specified service does not exist', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'entries' },
  }
  const getService = () => undefined
  const expected = {
    status: 'error',
    error: "Service with id 'entries' does not exist",
    origin: 'handler:GET',
  }

  const ret = await get(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should get only authorized items', async (t) => {
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
      targetService: 'accounts',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const svc = setupService('http://api9.test/database', {}, { id: 'accounts' })
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

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data
  t.deepEqual(data, expectedData)
})

test('should return badrequest when no endpoint matches', async (t) => {
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

  t.deepEqual(ret, expected)
})
