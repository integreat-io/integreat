/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon = require('sinon')
import jsonResources from '../tests/helpers/resources'
import functions from '../transformers/builtIns'
import createSchema from '../schema'
import { ServiceDef } from './types'
import { TypedData, Connection, Action, DataObject } from '../types'
import { EndpointOptions } from '../service/endpoints/types'
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

const dispatch = async (_action: Action | null) => ({ status: 'ok' })

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
    })({ transporter: 'http' } as unknown as ServiceDef)
  })
})

// Tests -- endpointFromAction

test('endpointFromAction should return an endpoint for the action', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints,
  })
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = service.endpointFromAction(action)

  t.truthy(ret)
  t.is(ret?.id, 'endpoint2')
})

test('endpointFromAction should return undefined when no match', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'entries',
    transporter: 'http',
    endpoints,
  })
  const action = {
    type: 'GET',
    payload: {
      type: 'unknown',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = service.endpointFromAction(action)

  t.is(ret, undefined)
})

test('endpointFromAction should pick the most specified endpoint', async (t) => {
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = service.endpointFromAction(action)

  t.true(ret?.options.correct)
})

// Tests -- authorizeAction

test('authorizeAction should set authorized flag', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { root: true, id: 'root' } },
  }
  const expectedAction = {
    ...action,
    meta: {
      ...action.meta,
      authorized: true,
    },
  }

  const ret = service.authorizeAction(action)

  t.deepEqual(ret, expectedAction)
})

test('authorizeAction should authorize action without type', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const action = {
    type: 'SET',
    payload: { params: { what: 'somethingelse' } },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction = {
    ...action,
    meta: {
      ...action.meta,
      authorized: true,
    },
  }

  const ret = service.authorizeAction(action)

  t.deepEqual(ret, expectedAction)
})

test('authorizeAction should refuse based on schema', (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: {
      ident: { id: 'johnf', roles: ['user'] },
      auth: { status: 'granted' },
    },
  }
  const expectedAction = {
    ...action,
    response: {
      status: 'noaccess',
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
    meta: { ...action.meta, authorized: false },
  }

  const ret = service.authorizeAction(action)

  t.deepEqual(ret, expectedAction)
})

// Tests -- send

test('send should retrieve data from service', async (t) => {
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
        send: async (_action: Action) => ({ status: 'ok', data }),
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    ...action,
    response: {
      status: 'ok',
      data,
    },
    meta: {
      ...action.meta,
      auth: {
        Authorization: 'Bearer t0k3n',
      },
    },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should use outgoing middleware', async (t) => {
  const failMiddleware = () => async (action: Action) => ({
    ...action,
    response: { status: 'badresponse' },
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
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      ident: { id: 'johnf' },
      options: { uri: 'http://some.api/1.0' },
      authorized: true,
    },
  }

  const ret = await service.send(action)

  t.is(ret.response?.status, 'badresponse', ret.response?.error)
})

test('send should return error when no transport', async (t) => {
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
        send: async (_action: Action) => ({ status: 'ok', data }),
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: "Service 'entries' has no transporter",
    },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should authenticate and return with error', async (t) => {
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
        send: async (_action: Action) => ({ status: 'ok', data }),
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    ...action,
    response: {
      status: 'noaccess',
      error: "Authentication attempt for 'refusing' was refused.",
    },
    meta: {
      ...action.meta,
      auth: null,
    },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should fail when not authorized', async (t) => {
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: false,
    },
  }
  const expected = {
    ...action,
    response: { status: 'error', error: 'Not authorized' },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should connect before sending request', async (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const connect = async (
    { value }: EndpointOptions,
    authentication: Record<string, unknown> | null | undefined,
    _connection: Connection | null
  ) => ({ status: 'ok', value, token: authentication?.Authorization })
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
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

  const ret = await service.send(action)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][1], expected)
})

test('send should store connection', async (t) => {
  const connect = sinon.stub().returns({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        connect,
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
      authorized: true,
    },
  }

  await service.send(action)
  await service.send(action)

  t.is(connect.callCount, 2)
  t.deepEqual(connect.args[0][2], null)
  t.deepEqual(connect.args[1][2], { status: 'ok' })
})

test('send should return error when connection fails', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        connect: async () => ({ status: 'notfound', error: 'Not found' }),
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
      authorized: true,
    },
  }

  const ret = await service.send(action)

  t.is(ret.response?.status, 'error')
  t.is(
    ret.response?.error,
    "Could not connect to service 'entries'. [notfound] Not found"
  )
})

test('send should retrieve error response from service', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (_action: Action) => ({
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    ...action,
    response: { status: 'badrequest', error: 'Real bad request' },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should return with error when transport throws', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (_action: Action) => {
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: "Error retrieving from service 'entries': We did not expect this",
    },
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should do nothing when action has a response', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        send: async (_action: Action) => ({
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    response: { status: 'badrequest', error: 'Bad request catched early' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = action

  const ret = await service.send(action)

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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', params: { source: 'thenews' } },
    response: {
      status: 'ok',
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
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expected = {
    ...action,
    response: {
      status: 'ok',
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
  }

  const ret = service.mapResponse(action, endpoint!)

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
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'account' },
    response: {
      status: 'ok',
      data: {
        content: {
          data: { accounts: { id: 'johnf', name: 'John F.' } },
        },
      },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapResponse(action, endpoint!)

  const data = ret.response?.data as DataObject
  t.false(Array.isArray(data))
  t.is(data.id, 'johnf')
  t.is(data.$type, 'account')
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
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'account' },
    response: {
      status: 'ok',
      data: { accounts: null },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expected = {
    ...action,
    response: {
      status: 'ok',
      data: undefined,
    },
  }

  const ret = service.mapResponse(action, endpoint!)

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
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: {
      status: 'ok',
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'maryk', name: 'Mary K.' },
        ],
      },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapResponse(action, endpoint!)

  t.is(ret.response?.status, 'ok')
  const data = ret.response?.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(
    ret.response?.warning,
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
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: {
      status: 'ok',
      data: {
        accounts: { id: 'maryk', name: 'Mary K.' },
      },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapResponse(action, endpoint!)

  t.is(ret.response?.status, 'noaccess')
  t.is(ret.response?.data, undefined)
  t.is(ret.response?.error, "Authentication was refused for type 'account'")
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
  const action = {
    type: 'SET',
    payload: { type: 'account' },
    response: {
      status: 'ok',
      data: [
        { id: 'johnf', $type: 'account', name: 'John F.' },
        { id: 'maryk', $type: 'account', name: 'Mary K.' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const isIncoming = true

  const ret = service.mapResponse(action, endpoint!, isIncoming)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  const accounts = (ret.response?.data as DataObject).accounts as DataObject[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.is(
    ret.response?.warning,
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'ok',
      returnNoDefaults: true,
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapResponse(action, endpoint!)

  const data = ret.response?.data as TypedData[]
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
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'ok',
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapResponse(action, endpoint!)

  const data = ret.response?.data as TypedData[]
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
  const action = {
    type: 'SET',
    payload: {
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
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedAction = {
    ...action,
    payload: {
      ...action.payload,
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
    meta: {
      ...action.meta,
      options: { uri: 'http://some.api/1.0' },
    },
  }

  const ret = service.mapRequest(action, endpoint!)

  t.deepEqual(ret, expectedAction)
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
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapRequest(action, endpoint!)
  const options = ret.meta?.options as { untouchable: { touched: boolean } }
  options.untouchable.touched = true

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
  const action = {
    type: 'SET',
    payload: {
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
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedResponse = {
    status: null,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = service.mapRequest(action, endpoint!)

  const accounts = (ret.payload.data as DataObject).accounts as DataObject[]
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
  const action = {
    type: 'SET',
    payload: {
      type: 'account',
      data: {
        $type: 'account',
        id: 'lucyk',
        name: 'Lucy K.',
      },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused for type 'account'",
    reason: 'WRONG_IDENT',
  }

  const ret = service.mapRequest(action, endpoint!)

  t.is((ret.payload.data as DataObject).accounts, undefined)
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should authorize data array coming from service', async (t) => {
  const service = setupService({ mapOptions, schemas, ...jsonResources })({
    id: 'accounts',
    transporter: 'http',
    auth: authDef,
    endpoints,
  })
  const action = {
    type: 'SET',
    payload: {
      type: 'account',
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'lucyk', name: 'Lucy K.' },
        ],
      },
    },
    meta: {
      ident: { id: 'johnf', roles: ['admin'] },
      authorized: true,
    },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedResponse = {
    status: null,
    warning: '1 item was removed from request data due to lack of access',
  }
  const isIncoming = true

  const ret = service.mapRequest(action, endpoint!, isIncoming)

  t.is(ret.response?.status, null, ret.response?.error)
  const data = ret.payload.data as DataObject[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(data[0].$type, 'account')
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
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedData = {
    StupidSoapOperator: { StupidSoapEmptyArgs: {} },
  }

  const ret = service.mapRequest(action, endpoint!)

  t.deepEqual(ret.payload.data, expectedData)
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
  const action = {
    type: 'SET',
    payload: {
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
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapRequest(action, endpoint!)

  const data = ((ret.payload.data as DataObject).content as DataObject)
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
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'The heading',
        },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = service.mapRequest(action, endpoint!)

  const data = ((ret.payload.data as DataObject).content as DataObject)
    .data as DataObject[]
  const items = (data[0].createOrMutate as DataObject).items as DataObject[]
  t.is(items[0].one, undefined)
})

// Tests -- listen

test('listen should call transporter.listen', async (t) => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'granting',
    transporter: 'http',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = { status: 'ok' }
  const expectedConnection = { status: 'ok' }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
  t.is(listenStub.callCount, 1)
  t.is(listenStub.args[0][0], dispatch)
  t.deepEqual(listenStub.args[0][1], expectedConnection)
})

test('listen should return error when connection fails', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        listen: async () => ({ status: 'ok' }),
        connect: async () => ({
          status: 'timeout',
          error: 'Connection attempt timed out',
        }),
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'granting',
    transporter: 'http',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = {
    status: 'error',
    error: "Could not listen to 'entries' service. Failed to connect",
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should return error when authentication fails', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        listen: async () => ({ status: 'ok' }),
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'refusing',
    transporter: 'http',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication attempt for 'refusing' was refused.",
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should do nothing when transporter has no listen method', async (t) => {
  const resources = {
    ...jsonResources,
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
  const expectedResponse = {
    status: 'noaction',
    error: 'Transporter has no listen method',
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should return error when no transporter', async (t) => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'granting',
    transporter: 'unknown',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = {
    status: 'error',
    error: "Service 'entries' has no transporter",
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

// Tests -- close

test('close should disconnect transporter', async (t) => {
  const disconnectStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        disconnect: disconnectStub,
      },
    },
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'granting',
    transporter: 'http',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = { status: 'ok' }
  const expectedConnection = { status: 'ok' }

  await service.listen(dispatch)
  const ret = await service.close()

  t.deepEqual(ret, expectedResponse)
  t.is(disconnectStub.callCount, 1)
  t.deepEqual(disconnectStub.args[0][0], expectedConnection)
})

test('close should do nothing when no transporter', async (t) => {
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
    auths,
  }
  const service = setupService(resources)({
    id: 'entries',
    auth: 'granting',
    transporter: 'unknown',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  })
  const expectedResponse = {
    status: 'noaction',
    error: 'No transporter to disconnect',
  }

  const ret = await service.close()

  t.deepEqual(ret, expectedResponse)
})
