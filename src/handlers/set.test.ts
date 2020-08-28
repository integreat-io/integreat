import test from 'ava'
import nock = require('nock')
import createService from '../service'
import {
  jsonServiceDef,
  jsonPipelines,
  jsonFunctions,
} from '../tests/helpers/json'
import schema from '../schema'
import functions from '../transformers/builtIns'
import { completeExchange } from '../utils/exchangeMapping'
import { TypedData } from '../types'

import set from './set'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    shape: {
      title: { $cast: 'string', $default: 'A title' },
      one: 'integer',
    },
  }),
  account: schema({
    id: 'account',
    shape: {
      name: 'string',
      posts: 'entry',
    },
    access: { identFromField: 'id' },
  }),
}

const mapOptions = {
  pipelines: {
    ...jsonPipelines,
    entry: [
      {
        $iterate: true,
        id: 'id',
        title: 'header',
      },
      { $apply: 'cast_entry' },
    ],
    account: [
      {
        $iterate: true,
        id: 'id',
        name: 'name',
        posts: 'entries',
      },
      { $apply: 'cast_account' },
    ],
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
  },
  functions: { ...functions, ...jsonFunctions },
}

const typeMappingFromServiceId = (serviceId: string) =>
  serviceId === 'accounts' ? 'account' : 'entry'

const setupService = (uri: string, id = 'entries', method = 'POST') => {
  return createService({
    schemas,
    mapOptions,
  })({
    id,
    ...jsonServiceDef,
    endpoints: [
      {
        mutation: [
          {
            $direction: 'rev',
            data: ['data.docs[]', { $apply: typeMappingFromServiceId(id) }],
          },
          {
            $direction: 'fwd',
            data: ['data', { $apply: typeMappingFromServiceId(id) }],
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
  })
}

const dispatch = async () => completeExchange({ status: 'ok' })

test.after(() => {
  nock.restore()
})

// Tests

test('should map and set items to service', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', {
      docs: [
        { id: 'ent1', header: 'Entry 1' },
        { id: 'ent2', header: 'Entry 2' },
      ],
    })
    .reply(201, [{ ok: true }, { ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      service: 'entries',
      data: [
        { $type: 'entry', id: 'ent1', title: 'Entry 1' },
        { $type: 'entry', id: 'ent2', title: 'Entry 2' },
      ],
    },
  })
  const src = setupService('http://api1.test/database/_bulk_docs')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should map and set one item to service', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/_bulk_docs', {
      docs: [{ id: 'ent1', header: 'A title' }],
    })
    .reply(201, [{ ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      type: 'entry',
      data: [{ $type: 'entry', id: 'ent1' }],
    },
    ident: { id: 'johnf' },
  })
  const src = setupService('http://api4.test/database/_bulk_docs')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should send without default values', async (t) => {
  const scope = nock('http://api5.test')
    .put('/database/entry:ent1', { docs: [{ id: 'ent1' }] })
    .reply(200, { okay: true, id: 'ent1', rev: '000001' })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1' },
      sendNoDefaults: true,
    },
  })
  const src = setupService(
    'http://api5.test/database/{{params.type}}:{{params.id}}',
    undefined,
    'PUT'
  )
  const getService = (type?: string | string[], _service?: string) =>
    type === 'entry' ? src : undefined

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should infer service id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/_bulk_docs')
    .reply(201, [{ ok: true }, { ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent2', $type: 'entry' },
      ],
    },
  })
  const src = setupService('http://api2.test/database/_bulk_docs')
  const getService = (type?: string | string[], _service?: string) =>
    type === 'entry' ? src : undefined

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should set to specified endpoint', async (t) => {
  const scope = nock('http://api1.test')
    .put('/other/_bulk_docs')
    .reply(201, [{ ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    endpointId: 'other',
  })
  const src = setupService('http://api1.test/database/_bulk_docs')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should set to uri with params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/_bulk_docs')
    .reply(201, [{ ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      data: [{ id: 'ent1', $type: 'entry' }],
      params: { typefolder: 'entries' },
    },
  })
  const src = setupService('http://api3.test/{{params.typefolder}}/_bulk_docs')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should return error when service fails', async (t) => {
  nock('http://api7.test').post('/database/_bulk_docs').reply(404)
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
  })
  const src = setupService('http://api7.test/database/_bulk_docs')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'notfound', ret.response.error)
  t.is(typeof ret.response.error, 'string')
  t.falsy(ret.response.data)
})

test('should return error when no service exists for a type', async (t) => {
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: { id: 'ent1', $type: 'entry' },
    },
  })

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.response.error, "No service exists for type 'entry'")
})

test('should get type from data $type', async (t) => {
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: { id: 'ent1', $type: 'entry' },
    },
  })

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.response.error, "No service exists for type 'entry'")
})

test('should return error when specified service does not exist', async (t) => {
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      data: { id: 'ent1', $type: 'entry' },
    },
  })

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.response.error, "Service with id 'entries' does not exist")
})

test('should authenticate items', async (t) => {
  const scope = nock('http://api6.test')
    .post('/database/_bulk_docs', {
      docs: [{ id: 'johnf', name: 'John F.' }],
    })
    .reply(201, [{ ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'account',
      service: 'accounts',
      data: [
        { id: 'johnf', $type: 'account', name: 'John F.' },
        { id: 'betty', $type: 'account', name: 'Betty' },
      ],
    },
    ident: { id: 'johnf' },
  })
  const src = setupService('http://api6.test/database/_bulk_docs', 'accounts')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'accounts' ? src : undefined

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test('should return empty response from service', async (t) => {
  nock('http://api8.test').post('/database/_bulk_docs').reply(201)
  const src = setupService('http://api8.test/database/_bulk_docs', 'accounts')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'accounts' ? src : undefined
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'accounts',
      data: [
        { id: 'johnf', $type: 'account', name: 'John F.' },
        { id: 'betty', $type: 'account', name: 'Betty' },
      ],
    },
    ident: { id: 'johnf' },
  })

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(ret.response.data, undefined)
})

test('should map response data', async (t) => {
  nock('http://api9.test')
    .post('/database/_bulk_docs')
    .reply(201, [
      { id: 'johnf', type: 'account', name: 'John Fjon', entries: [] },
    ])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'accounts',
      data: [
        {
          $type: 'account',
          name: 'John F.',
          posts: [{ id: 'ent1', $ref: 'entry' }],
        },
      ],
    },
    ident: { root: true },
  })
  const src = setupService('http://api9.test/database/_bulk_docs', 'accounts')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  const data = ret.response.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data.length, 1)
  t.is(data[0].$type, 'account')
  t.is(data[0].id, 'johnf')
  t.is(data[0].name, 'John Fjon')
})

test('should map non-array response data', async (t) => {
  nock('http://api10.test').post('/database/_bulk_docs').reply(201, {
    id: 'johnf',
    type: 'account',
    name: 'John Fjon',
    entries: [],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'accounts',
      data: { $type: 'account', name: 'John F.' },
    },
    ident: { root: true },
  })
  const src = setupService('http://api10.test/database/_bulk_docs', 'accounts')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  const data = ret.response.data as TypedData
  t.false(Array.isArray(data))
  t.is(data.$type, 'account')
  t.is(data.id, 'johnf')
  t.is(data.name, 'John Fjon')
})

test('should allow null as request data', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', '{"docs":[]}')
    .reply(201, [{ ok: true }, { ok: true }])
  const exchange = completeExchange({
    type: 'SET',
    request: {
      service: 'entries',
      data: null,
    },
  })
  const src = setupService('http://api1.test/database/_bulk_docs')
  const getService = () => src

  const ret = await set(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.true(scope.isDone())
})

test.todo('should return noaction when no endpoint matches')
