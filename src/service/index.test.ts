/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon = require('sinon')
import jsonResources from '../tests/helpers/resources'
import functions from '../transformers/builtIns'
import createSchema from '../schema'
import { ServiceDef } from './types'
import { TypedData, Connection, Exchange, DataObject, Data } from '../types'
import { EndpointOptions } from '../service/endpoints/types'
import { completeExchange, responseToExchange } from '../utils/exchangeMapping'
import Auth from './Auth'
import tokenAuth from '../authenticators/token'

import setupService from '.'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer',
      source: 'source',
    },
    access: 'auth',
  }),
  account: createSchema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: {
      role: 'admin',
      actions: {
        SET: { identFromField: 'id' },
        TEST: 'all',
      },
    },
  }),
}

const entryMapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
    source: '^params.source',
    author: '^access.ident.id',
    createdAt: 'created',
    updatedAt: 'updated',
  },
  { $apply: 'cast_entry' },
]

const entry2Mapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'subheader',
  },
  { $apply: 'cast_entry' },
]

const accountMapping = [
  'accounts',
  {
    $iterate: true,
    id: 'id',
    name: 'name',
  },
  { $apply: 'cast_account' },
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
    entry: entryMapping,
    entry2: entry2Mapping,
    account: accountMapping,
  },
  functions,
}

const endpoints = [
  {
    id: 'endpoint1',
    match: { type: 'entry' },
    mutation: { data: ['data', { $apply: 'entry' }] },
    options: { uri: 'http://test.api/1' },
  },
  {
    id: 'endpoint2',
    match: { type: 'entry', scope: 'member' },
    mutation: { data: ['data', { $apply: 'entry' }] },
    options: { uri: 'http://test.api/2' },
  },
  {
    id: 'endpoint3',
    match: { type: 'account' },
    mutation: { data: ['data', { $apply: 'account' }] },
    options: { uri: 'http://some.api/1.0' },
  },
  {
    match: { action: 'SET' },
    mutation: { data: ['data', { $apply: 'entry' }] },
    options: { uri: 'http://some.api/1.0/untyped' },
  },
]

const auths = {
  granting: new Auth('granting', tokenAuth, { token: 't0k3n' }),
  refusing: new Auth('refusing', tokenAuth, {}),
}

const authDef = { id: 'auth1', authenticator: 'auth', options: {} }

// Tests

test('should return service object with id and meta', (t) => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', transporter: 'http', endpoints, meta: 'meta' }

  const service = setupService({
    ...jsonResources,
    mapOptions,
    schemas,
  })(def)

  t.is(service.id, 'entries')
  t.is(service.meta, 'meta')
})

test('should throw when no id', (t) => {
  t.throws(() => {
    setupService({
      ...jsonResources,
      mapOptions,
      schemas,
    })(({ transporter: 'http' } as unknown) as ServiceDef)
  })
})

// Tests -- endpointFromExchange

test('endpointFromExchange should return an endpoint for the exchange', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints,
  })
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
      id: 'ent1',
    },
    ident: { id: 'johnf' },
  })

  const ret = service.endpointFromExchange(exchange)

  t.truthy(ret)
  t.is(ret?.id, 'endpoint2')
})

test('endpointFromExchange should return undefined when no match', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints,
  })
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'unknown',
    },
    ident: { id: 'johnf' },
  })

  const ret = service.endpointFromExchange(exchange)

  t.is(ret, undefined)
})

test('endpointFromExchange should pick the most specified endpoint', async (t) => {
  const endpoints = [
    {
      match: { type: 'entry' },
      options: { uri: 'http://test.api/1' },
      correct: false,
    },
    {
      match: { type: 'entry', scope: 'member' },
      options: { uri: 'http://test.api/2', correct: true },
    },
  ]
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    endpoints,
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
  })

  const ret = service.endpointFromExchange(exchange)

  t.true(ret?.options.correct)
})

// Tests -- authorizeExchange

test('authorizeExchange should set authorized flag', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    ident: { root: true, id: 'root' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should authorize exchange request without type', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'SET',
    request: { params: { what: 'somethingelse' } },
    ident: { id: 'johnf' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should refuse based on schema', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'account' },
    ident: { id: 'johnf', roles: ['user'] },
    auth: { status: 'granted' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: false,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
  }

  const ret = service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

// Tests -- sendExchange

test('sendExchange should retrieve data from service', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, { status: 'ok', data }),
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'granting',
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = {
    ...exchange,
    status: 'ok',
    response: { data },
    auth: {
      Authorization: 'Bearer t0k3n',
    },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should use outgoing middleware', async (t) => {
  const failMiddleware = () => async (exchange: Exchange) => ({
    ...exchange,
    status: 'badresponse',
  })
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
    auths,
    middleware: [failMiddleware],
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: true,
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { type: 'entry' },
    ident: { id: 'johnf' },
    options: { uri: 'http://some.api/1.0' },
    authorized: true,
  })

  const ret = await service.sendExchange(exchange)

  t.is(ret.status, 'badresponse', ret.response.error)
})

test('sendExchange should return error when no transport', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, { status: 'ok', data }),
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'granting',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: { error: "Service 'entries' has no transporter" },
    auth: undefined,
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should authenticate and return with error', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, { status: 'ok', data }),
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'refusing',
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = {
    ...exchange,
    status: 'noaccess',
    response: { error: "Authentication attempt for 'refusing' was refused." },
    auth: null,
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should fail when not authorized', async (t) => {
  const service = setupService({
    mapOptions,
    schemas,
    ...jsonResources,
    auths,
  })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'granting',
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: false,
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: { error: 'Not authorized' },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should connect before sending request', async (t) => {
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const connect = async (
    { value }: EndpointOptions,
    authentication: Record<string, unknown> | null | undefined,
    _connection: Connection | null
  ) => ({ status: 'ok', value, token: authentication?.Authorization })
  const send = sinon
    .stub()
    .resolves(responseToExchange(exchange, { status: 'ok', data: {} }))
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters.http, connect, send },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from endpoint' } },
    ],
    options: { value: 'Value from service' },
    transporter: 'http',
    auth: 'granting',
  })
  const expected = {
    status: 'ok',
    value: 'Value from service',
    token: 'Bearer t0k3n',
  }

  const ret = await service.sendExchange(exchange)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][1], expected)
})

test('sendExchange should store connection', async (t) => {
  const connect = sinon.stub().returns({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        connect,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, { status: 'ok', data: {} }),
      },
    },
    mapOptions,
    schemas,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from options' } },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    auth: { status: 'granted', token: 't0k3n' },
    authorized: true,
  })

  await service.sendExchange(exchange)
  await service.sendExchange(exchange)

  t.is(connect.callCount, 2)
  t.deepEqual(connect.args[0][2], null)
  t.deepEqual(connect.args[1][2], { status: 'ok' })
})

test('sendExchange should return error when connection fails', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        connect: async () => ({ status: 'notfound', error: 'Not found' }),
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, { status: 'ok', data: {} }),
      },
    },
    mapOptions,
    schemas,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from options' } },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    auth: { status: 'granted', token: 't0k3n' },
    authorized: true,
  })

  const ret = await service.sendExchange(exchange)

  t.is(ret.status, 'error')
  t.is(
    ret.response.error,
    "Could not connect to service 'entries'. [notfound] Not found"
  )
})

test('sendExchange should retrieve error response from service', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, {
            status: 'badrequest',
            error: 'Real bad request',
          }),
      },
    },
    mapOptions,
    schemas,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = {
    ...exchange,
    status: 'badrequest',
    response: { error: 'Real bad request' },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should return with error when transport throws', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (_exchange: Exchange) => {
          throw new Error('We did not expect this')
        },
      },
    },
    mapOptions,
    schemas,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      error: "Error retrieving from service 'entries': We did not expect this",
    },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should do nothing when exchange has a status', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (exchange: Exchange) =>
          responseToExchange(exchange, {
            status: 'error',
            error: 'Should not be called',
          }),
      },
    },
    mapOptions,
    schemas,
  }
  const service = setupService(resources)({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    transporter: 'http',
  })
  const exchange = completeExchange({
    status: 'badrequest',
    type: 'GET',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    response: { error: 'Bad request catched early' },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const expected = exchange

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mapResponse

test.serial('mapResponse should map data array from service', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data.content.data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    response: {
      data: {
        content: {
          data: {
            items: [
              {
                key: 'ent1',
                header: 'Entry 1',
                two: 2,
                created: theDate,
                updated: theDate,
              },
            ],
          },
        },
      },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expected = {
    ...exchange,
    response: {
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'Entry 1',
          one: 1,
          two: 2,
          source: { id: 'thenews', $ref: 'source' },
          createdAt: theDate,
          updatedAt: theDate,
        },
      ],
    },
    ident: { id: 'johnf' },
  }

  const ret = service.mapResponse(exchange, endpoint!)

  t.deepEqual(ret, expected)
})

test('mapResponse should map data object from service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data.content.data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { id: 'johnf', type: 'account' },
    response: {
      data: {
        content: {
          data: { accounts: { id: 'johnf', name: 'John F.' } },
        },
      },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapResponse(exchange, endpoint!) as Exchange<
    Data,
    TypedData
  >

  t.false(Array.isArray(ret.response.data))
  t.is(ret.response.data?.id, 'johnf')
  t.is(ret.response.data?.$type, 'account')
})

test('mapResponse should map null to undefined', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { id: 'johnf', type: 'account' },
    response: {
      data: { accounts: null },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expected = {
    ...exchange,
    response: {
      data: undefined,
    },
    ident: { id: 'johnf' },
  }

  const ret = service.mapResponse(exchange, endpoint!)

  t.deepEqual(ret, expected)
})

test('should authorize typed data in array from service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'SET',
    status: 'ok',
    request: { type: 'account' },
    response: {
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'maryk', name: 'Mary K.' },
        ],
      },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapResponse(exchange, endpoint!) as Exchange<
    Data,
    TypedData[]
  >

  t.is(ret.status, 'ok')
  t.is(ret.response.data?.length, 1)
  t.is(ret.response.data![0].id, 'johnf')
  t.is(
    ret.response.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('should authorize typed data object from service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'SET',
    status: 'ok',
    request: { type: 'account' },
    response: {
      data: {
        accounts: { id: 'maryk', name: 'Mary K.' },
      },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapResponse(exchange, endpoint!)

  t.is(ret.status, 'noaccess')
  t.is(ret.response.data, undefined)
  t.is(ret.response.error, "Authentication was refused for type 'account'")
})

test('should authorize typed data in array to service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'SET',
    status: 'ok',
    request: { type: 'account' },
    response: {
      data: [
        { id: 'johnf', $type: 'account', name: 'John F.' },
        { id: 'maryk', $type: 'account', name: 'Mary K.' },
      ],
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const isIncoming = true

  const ret = service.mapResponse(exchange, endpoint!, isIncoming) as Exchange<
    Data,
    TypedData
  >

  t.is(ret.status, 'ok', ret.response.error)
  const accounts = ret.response.data?.accounts as DataObject[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.is(
    ret.response.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('mapResponse should map without default values', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { id: 'ent1', type: 'entry' },
    response: {
      returnNoDefaults: true,
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapResponse(exchange, endpoint!)

  const data = ret.response.data as TypedData[]
  t.is(data[0].one, undefined)
  t.is(data[0].createdAt, undefined)
  t.is(data[0].updatedAt, undefined)
})

test('mapResponse should map without default values - defined on endpoint', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
        returnNoDefaults: true,
      },
    ],
    transporter: 'http',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: 'ok',
    request: { id: 'ent1', type: 'entry' },
    response: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
    ident: { id: 'johnf' },
    authorized: true,
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapResponse(exchange, endpoint!)

  const data = ret.response.data as TypedData[]
  t.is(data[0].one, undefined)
  t.is(data[0].createdAt, undefined)
  t.is(data[0].updatedAt, undefined)
})

// Tests -- mapRequest

test('mapRequest should set endpoint options and cast and map request data', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints: [
      {
        mutation: {
          data: ['data.content.data[].createOrMutate', { $apply: 'entry' }],
        },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'The heading',
          two: '2',
          createdAt: theDate,
          updatedAt: theDate,
        },
      ],
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expectedExchange = {
    ...exchange,
    request: {
      ...exchange.request,
      data: {
        content: {
          data: [
            {
              createOrMutate: {
                items: [
                  {
                    key: 'ent1',
                    header: 'The heading',
                    one: 1,
                    two: 2,
                    created: theDate,
                    updated: theDate,
                  },
                ],
              },
            },
          ],
        },
      },
    },
    options: { uri: 'http://some.api/1.0' },
  }

  const ret = service.mapRequest(exchange, endpoint!)

  t.deepEqual(ret, expectedExchange)
})

test('mapRequest should deep-clone endpoint options', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints: [
      {
        options: { untouchable: { touched: false } },
      },
    ],
  })
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'entry',
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapRequest(exchange, endpoint!)
  ;(ret.options?.untouchable as { touched: boolean }).touched = true

  t.false((endpoint?.options.untouchable as { touched: boolean }).touched)
})

test.todo('should strip undefined from data array')

test('mapRequest should authorize data array going to service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'account',
      data: [
        {
          $type: 'account',
          id: 'johnf',
          name: 'John F.',
        },
        {
          $type: 'account',
          id: 'lucyk',
          name: 'Lucy K.',
        },
      ],
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expectedResponse = {
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = service.mapRequest(exchange, endpoint!) as Exchange<
    DataObject,
    Data
  >

  const accounts = ret.request.data?.accounts as DataObject[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should authorize data object going to service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'account',
      data: {
        $type: 'account',
        id: 'lucyk',
        name: 'Lucy K.',
      },
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expectedResponse = {
    error: "Authentication was refused for type 'account'",
    reason: 'WRONG_IDENT',
  }

  const ret = service.mapRequest(exchange, endpoint!) as Exchange<
    DataObject,
    Data
  >

  t.is(ret.request.data?.accounts, undefined)
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should authorize data array coming from service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'account',
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'lucyk', name: 'Lucy K.' },
        ],
      },
    },
    ident: { id: 'johnf', roles: ['admin'] },
    authorized: true,
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expectedResponse = {
    warning: '1 item was removed from request data due to lack of access',
  }
  const isIncoming = true

  const ret = service.mapRequest(exchange, endpoint!, isIncoming) as Exchange<
    TypedData[],
    Data
  >

  t.is(ret.status, null, ret.response.error)
  t.is(ret.request.data?.length, 1)
  t.is(ret.request.data![0].id, 'johnf')
  t.is(ret.request.data![0].$type, 'account')
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should use mutation pipeline', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints: [
      {
        mutation: [
          'data',
          {
            data: [
              'StupidSoapOperator.StupidSoapEmptyArgs',
              { $alt: 'value', value: {} },
            ],
          },
          { $apply: 'entry' },
        ],
        options: { uri: 'http://soap.api/1.1' },
      },
    ],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {},
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)
  const expectedData = {
    StupidSoapOperator: { StupidSoapEmptyArgs: {} },
  }

  const ret = service.mapRequest(exchange, endpoint!)

  t.deepEqual(ret.request.data, expectedData)
})

test('mapRequest should map without default values', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints: [
      {
        mutation: {
          data: ['data.content.data[].createOrMutate', { $apply: 'entry' }],
        },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'The heading',
        },
      ],
      sendNoDefaults: true,
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapRequest(exchange, endpoint!)

  const data = ((ret.request.data as DataObject).content as DataObject)
    .data as DataObject[]
  const items = (data[0].createOrMutate as DataObject).items as DataObject[]
  t.is(items[0].one, undefined)
})

test('mapRequest should map without default values - defined on enpoint', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints: [
      {
        mutation: {
          data: ['data.content.data[].createOrMutate', { $apply: 'entry' }],
        },
        options: { uri: 'http://some.api/1.0' },
        sendNoDefaults: true,
      },
    ],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'The heading',
        },
      ],
    },
    ident: { id: 'johnf' },
  })
  const endpoint = service.endpointFromExchange(exchange)

  const ret = service.mapRequest(exchange, endpoint!)

  const data = ((ret.request.data as DataObject).content as DataObject)
    .data as DataObject[]
  const items = (data[0].createOrMutate as DataObject).items as DataObject[]
  t.is(items[0].one, undefined)
})
