import test from 'ava'
import sinon = require('sinon')
import nock = require('nock')
import createService from '../service/index.js'
import {
  jsonServiceDef,
  jsonPipelines,
  jsonFunctions,
} from '../tests/helpers/json.js'
import schema from '../schema/index.js'
import transformers from '../transformers/builtIns/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import { Action, TypedData } from '../types.js'

import get from './get.js'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    shape: {
      title: 'string',
      byline: { $cast: 'string', $default: 'Somebody' },
      source: 'source',
    },
  }),
  account: schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
}

const pipelines = {
  ...jsonPipelines,
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
}

const mapOptions = {
  pipelines,
  transformers: { ...transformers, ...jsonFunctions },
}

const setupService = (uri: string, match = {}, { id = 'entries' } = {}) =>
  createService({ schemas, mapOptions })({
    id,
    ...jsonServiceDef,
    endpoints: [
      {
        match,
        options: { uri },
        mutation: {
          response: 'response',
          'response.data': [
            'response.data',
            { $apply: id === 'accounts' ? 'account' : 'entry' },
          ],
        },
      },
      {
        id: 'other',
        options: { uri: 'http://api5.test/other' },
        mutation: {
          response: 'response',
          'response.data': ['response.data', { $apply: 'entry' }],
        },
      },
    ],
  })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get all items from service', async (t) => {
  const date = new Date()
  const scope = nock('http://api1.test')
    .get('/database')
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
    },
    meta: { ident: { id: 'johnf' } },
  }
  const svc = setupService('http://api1.test/database')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? svc : undefined
  const expectedResponse = {
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

  t.deepEqual(ret.response, expectedResponse)
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
    'http://api1.test/database/{{payload.type}}:{{payload.id}}'
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? svc : undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is((ret.response?.data as TypedData).id, 'ent1')
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
  const svc = setupService('http://api12.test/entries?id={{payload.id}}', {
    scope: 'members',
    id: 'membersEndpoint',
  })
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(Array.isArray(ret.response?.data))
  const data = ret.response?.data as TypedData[]
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
  const svc = setupService('http://api6.test/entries/{{payload.id}}', {
    scope: 'member',
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? svc : undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(Array.isArray(ret.response?.data))
  const data = ret.response?.data as (TypedData | undefined)[]
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
    .callsFake(async (action: Action) => ({
      ...action,
      response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
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
  const svc = setupService('http://api13.test/entries?id={{payload.id}}', {
    scope: 'members',
    id: 'membersEndpoint',
  })
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'noaction', ret.response?.error)
  t.is(ret.response?.error, 'GET action was dispatched with empty array of ids')
  t.is(ret.response?.data, undefined)
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

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'error')
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
  const svc = setupService('http://api7.test/entries/{{payload.id}}', {
    scope: 'member',
  })
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is((ret.response?.data as TypedData).id, 'ent1')
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

  t.is((ret.response?.data as TypedData[])[0].byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      targetService: 'entries',
    },
    response: { status: undefined, returnNoDefaults: true },
  }
  const svc = setupService('http://api1.test/database')
  const getService = () => svc

  const ret = await get(action, { ...handlerResources, getService })

  t.is((ret.response?.data as TypedData[])[0].byline, undefined)
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

  t.is(ret.response?.status, 'ok')
  t.is((ret.response?.data as TypedData[])[0].id, 'ent1')
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

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is((ret.response?.data as TypedData[])[0].id, 'ent1')
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

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'notfound')
  t.is(ret.response?.data, undefined)
  t.is(typeof ret.response?.error, 'string')
})

test('should return error when no service exists for type', async (t) => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const getService = () => undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, "No service exists for type 'entry'")
})

test('should return error when specified service does not exist', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry', targetService: 'entries' },
  }
  const getService = () => undefined

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, "Service with id 'entries' does not exist")
})

test('should return error when no getService', async (t) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getService = undefined as any
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      targetService: 'entries',
    },
  }

  const ret = await get(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.response?.status, 'error')
})

test('should get only authorized items', async (t) => {
  const date = new Date()
  nock('http://api9.test')
    .get('/database')
    .reply(200, [
      {
        id: 'johnf',
        type: 'account',
        name: 'John F.',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      },
      {
        id: 'betty',
        type: 'account',
        name: 'Betty K.',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
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
      createdAt: date,
      updatedAt: date,
    },
  ]

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  const data = ret.response?.data
  t.deepEqual(data, expectedData)
})

test('should return noaction when no endpoint matches', async (t) => {
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

  const ret = await get(action, { ...handlerResources, getService })

  t.is(ret.response?.status, 'noaction', ret.response?.error)
  t.is(typeof ret.response?.error, 'string')
})
