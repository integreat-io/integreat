/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon from 'sinon'
import pProgress from 'p-progress'
import mapTransform from 'map-transform'
import jsonResources from '../tests/helpers/resources/index.js'
import transformers from '../transformers/builtIns/index.js'
import createSchema from '../schema/index.js'
import dispatch from '../tests/helpers/dispatch.js'
import { isObject } from '../utils/is.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { Authenticator, ServiceDef } from './types.js'
import type {
  Connection,
  Action,
  Response,
  TypedData,
  Dispatch,
} from '../types.js'
import type { EndpointOptions } from '../service/endpoints/types.js'
import Auth from './Auth.js'
import tokenAuth from '../authenticators/token.js'
import optionsAuth from '../authenticators/options.js'

import Service from './index.js'

// Setup

const schemas = {
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
  entry: createSchema({
    id: 'entry',
    plural: 'entries',
    shape: {
      title: 'string',
      one: { $type: 'integer', default: 1 },
      two: 'integer',
      source: 'source',
      createdAt: 'date',
      updatedAt: 'date',
    },
    access: 'auth',
  }),
  source: createSchema({
    id: 'source',
    shape: {
      name: 'string',
    },
    access: 'auth',
  }),
}

const entryMutation = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'header',
    one: 'one',
    two: 'two',
    source: '^^payload.source',
    author: '^^access.ident.id',
    createdAt: 'created',
    updatedAt: 'updated',
  },
]

const entry2Mutation = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'subheader',
  },
]

const accountMutation = [
  'accounts',
  {
    $iterate: true,
    id: 'id',
    name: 'name',
  },
]

const mutations = {
  entry: entryMutation,
  entry2: entry2Mutation,
  account: accountMutation,
}

const mapOptions = createMapOptions(schemas, mutations, transformers)

const castFns = Object.fromEntries(
  Object.entries(schemas).map(([type, schema]) => [
    type,
    mapTransform(schema.mapping, mapOptions),
  ])
)

const endpoints = [
  {
    id: 'endpoint1',
    match: { type: 'entry' },
    mutation: {
      $direction: 'from',
      response: {
        $modify: 'response',
        data: ['response.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://test.api/1' },
  },
  {
    id: 'endpoint2',
    match: { type: 'entry', scope: 'member' },
    mutation: {
      $direction: 'from',
      response: {
        $modify: 'response',
        data: ['response.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://test.api/2' },
  },
  {
    id: 'endpoint3',
    match: { type: 'account', incoming: true },
    mutation: [
      {
        $direction: 'from',
        payload: {
          $modify: 'payload',
          data: ['payload.data', { $apply: 'account' }],
        },
      },
      {
        $direction: 'to',
        $flip: true,
        response: {
          $modify: 'response',
          data: ['response.data', { $apply: 'account' }],
        },
      },
    ],
    options: { uri: 'http://some.api/1.0' },
  },
  {
    match: { type: 'account' },
    mutation: [
      {
        $direction: 'to',
        $flip: true,
        payload: {
          $modify: 'payload',
          data: ['payload.data', { $apply: 'account' }],
        },
      },
      {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data', { $apply: 'account' }],
        },
      },
    ],
    options: { uri: 'http://some.api/1.0' },
  },
  {
    match: { action: 'SET' },
    mutation: {
      $direction: 'from',
      response: {
        $modify: 'response',
        data: ['response.data', { $apply: 'entry' }],
      },
    },
    options: { uri: 'http://some.api/1.0/untyped' },
  },
]

const grantingAuth = {
  id: 'granting',
  authenticator: 'token',
  options: { token: 't0k3n', type: 'Bearer' },
}

const testAuth: Authenticator = {
  async authenticate(_options, action) {
    const id = action?.payload.headers && action?.payload.headers['API-TOKEN']
    return id
      ? { status: 'granted', ident: { id } }
      : { status: 'rejected', error: 'Missing API-TOKEN header' }
  },
  isAuthenticated: (_authentication, _action) => false,
  authentication: {
    asObject: (authentication) =>
      isObject(authentication?.ident) ? authentication!.ident : {},
  },
}

// payload: { data: [], headers: { 'API-TOKEN': 'wr0ng' } },

const auths = {
  granting: new Auth('granting', tokenAuth, grantingAuth.options),
  refusing: new Auth('refusing', tokenAuth, {}),
  apiToken: new Auth('apiToken', testAuth, {}),
}

const mockResources = (
  data: unknown,
  action = { type: 'GET', payload: {} }
) => ({
  ...jsonResources,
  authenticators: {
    options: optionsAuth,
    token: tokenAuth,
  },
  transporters: {
    ...jsonResources.transporters,
    http: {
      ...jsonResources.transporters!.http,
      send: async (_action: Action) => ({ status: 'ok', data }),
      listen: async (dispatch: Dispatch) => {
        const response = await dispatch(action)
        return response || { status: 'ok' }
      },
    },
  },
  mapOptions,
  schemas,
  castFns,
  auths,
})

// Tests

test('should return service object with id and meta', (t) => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', transporter: 'http', endpoints, meta: 'meta' }

  const service = new Service(def, {
    ...jsonResources,
    mapOptions,
    schemas,
    castFns,
  })

  t.is(service.id, 'entries')
  t.is(service.meta, 'meta')
})

test('should throw when no id', (t) => {
  t.throws(() => {
    new Service({ transporter: 'http' } as unknown as ServiceDef, {
      ...jsonResources,
      mapOptions,
      schemas,
      castFns,
    })
  })
})

test('should throw when auth object references unknown authenticator', async (t) => {
  const defs = {
    id: 'entries',
    auth: {
      id: 'auth',
      authenticator: 'unknown',
      options: {},
    },
    transporter: 'http',
    options: {},
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
  }
  const resources = mockResources({})

  const error = t.throws(() => new Service(defs, resources))

  t.true(error instanceof Error)
})

// Tests -- endpointFromAction

test('endpointFromAction should return an endpoint for the action', (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const service = new Service(
    {
      id: 'entries',
      endpoints,
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = service.endpointFromAction(action)

  t.true(ret?.options.correct)
})

// Tests -- authorizeAction

test('authorizeAction should set authorized flag', (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: { what: 'somethingelse' },
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
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
      origin: 'auth:action',
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
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
      transporter: 'http',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = { status: 'ok', data }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should use service middleware', async (t) => {
  const failMiddleware = () => async (_action: Action) => ({
    status: 'badresponse',
  })
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
    castFns,
    auths,
    middleware: [failMiddleware],
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: true,
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      ident: { id: 'johnf' },
      options: { uri: 'http://some.api/1.0' },
      authorized: true,
    },
  }
  const expected = {
    status: 'badresponse',
    origin: 'middleware:service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should return error when no transporter', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      // No transporter
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    status: 'error',
    error: "Service 'entries' has no transporter",
    origin: 'internal:service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should try to authenticate and return with error when it fails', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'refusing',
      transporter: 'http',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    status: 'noaccess',
    error: "Authentication attempt for 'refusing' was refused.",
    origin: 'service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should authenticate with auth id on `outgoing` prop', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: { outgoing: 'granting' },
      transporter: 'http',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = { status: 'ok', data }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should authenticate with auth def', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: grantingAuth,
      transporter: 'http',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = { status: 'ok', data }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should authenticate with auth def on `outgoing` prop', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: { outgoing: grantingAuth },
      transporter: 'http',
    },
    mockResources(data)
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = { status: 'ok', data }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should fail when not authorized', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
      auths,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: false,
    },
  }
  const expected = {
    status: 'autherror',
    error: 'Not authorized',
    origin: 'internal:service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should connect before sending request', async (t) => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
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
      http: { ...jsonResources.transporters!.http, connect, send },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          options: { uri: 'http://some.api/1.0', value: 'Value from endpoint' },
        },
      ],
      options: { value: 'Value from service' },
      transporter: 'http',
      auth: 'granting',
    },
    resources
  )
  const expected = {
    status: 'ok',
    value: 'Value from service',
    token: 'Bearer t0k3n',
  }

  const ret = await service.send(action)

  t.is(ret.status, 'ok', ret.error)
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
        ...jsonResources.transporters!.http,
        connect,
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          options: { uri: 'http://some.api/1.0', value: 'Value from options' },
        },
      ],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
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
        ...jsonResources.transporters!.http,
        connect: async () => ({ status: 'notfound', error: 'Not found' }),
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          options: { uri: 'http://some.api/1.0', value: 'Value from options' },
        },
      ],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
      authorized: true,
    },
  }
  const expected = {
    status: 'error',
    error: "Could not connect to service 'entries'. [notfound] Not found",
    origin: 'service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should pass on error response from service', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        send: async (_action: Action) => ({
          status: 'badrequest',
          error: 'Real bad request',
        }),
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    status: 'badrequest',
    error: 'Real bad request',
    origin: 'service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should pass on error response from service and prefix origin', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        send: async (_action: Action) => ({
          status: 'badrequest',
          error: 'Real bad request',
          origin: 'somewhere',
        }),
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    status: 'badrequest',
    error: 'Real bad request',
    origin: 'service:entries:somewhere',
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
        ...jsonResources.transporters!.http,
        send: async (_action: Action) => {
          throw new Error('We did not expect this')
        },
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = {
    status: 'error',
    error: "Error retrieving from service 'entries': We did not expect this",
    origin: 'service:entries',
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
        ...jsonResources.transporters!.http,
        send: async (_action: Action) => ({
          status: 'error',
          error: 'Should not be called',
        }),
      },
    },
    mapOptions,
    schemas,
    castFns,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    response: {
      status: 'badrequest',
      error: 'Bad request catched early',
      origin: 'mutate:request',
    },
    meta: {
      ident: { id: 'johnf' },
      authorized: true,
    },
  }
  const expected = action.response

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

// Tests -- mutateResponse

test('mutateResponse should mutate data array from service', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          mutation: {
            $direction: 'from',
            response: {
              $modify: 'response',
              data: ['response.data.content.data', { $apply: 'entry' }],
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
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
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('mutateResponse should mutate data object from service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': [
              'response.data.content.data',
              { $apply: 'account' },
            ],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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

  const ret = await service.mutateResponse(action, endpoint!)

  const data = ret.data as TypedData
  t.false(Array.isArray(data))
  t.is(data.id, 'johnf')
  t.is(data.$type, 'account')
})

test('mutateResponse should set origin when mutation results in an error response', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: {
              status: { $value: 'error' },
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const expected = {
    status: 'error',
    data: undefined,
    origin: 'mutate:response',
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('mutateResponse should use service adapters', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      adapters: ['json'],
      endpoints: [
        {
          mutation: {
            $direction: 'from',
            response: {
              $modify: 'response',
              data: ['response.data.content.data', { $apply: 'entry' }],
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    response: {
      status: 'ok',
      data: JSON.stringify({
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
      }),
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expected = {
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
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('mutateResponse should use endpoint adapters', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          adapters: ['json'],
          mutation: {
            $direction: 'from',
            response: {
              $modify: 'response',
              data: ['response.data.content.data', { $apply: 'entry' }],
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    response: {
      status: 'ok',
      data: JSON.stringify({
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
      }),
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expected = {
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
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('mutateResponse should not cast data array from service when allowRawResponse is true', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          mutation: {
            $direction: 'from',
            response: {
              $modify: 'response',
              data: ['response.data.content.data', { $apply: 'entry' }],
            },
          },
          allowRawResponse: true,
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
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
    status: 'ok',
    data: [
      {
        id: 'ent1',
        title: 'Entry 1',
        one: undefined,
        two: 2,
        author: undefined,
        source: 'thenews',
        createdAt: theDate,
        updatedAt: theDate,
      },
    ],
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('mutateResponse should mutate null to undefined', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': ['response.data', { $apply: 'account' }],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
    status: 'ok',
    data: undefined,
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('should authorize typed data in array from service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': ['response.data', { $apply: 'account' }],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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

  const ret = await service.mutateResponse(action, endpoint!)

  t.is(ret.status, 'ok')
  const data = ret.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(
    ret.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('should authorize typed data object from service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': ['response.data', { $apply: 'account' }],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const expected = {
    status: 'noaccess',
    error: "Authentication was refused for type 'account'",
    origin: 'auth:data',
    reason: 'WRONG_IDENT',
    data: undefined,
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

test('should authorize typed data in array to service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': ['response.data', { $apply: 'account' }],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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

  const ret = await service.mutateResponse(action, endpoint!, isIncoming)

  t.is(ret.status, 'ok', ret.error)
  const accounts = (ret.data as TypedData).accounts as TypedData[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.is(
    ret.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('mutateResponse should return error when transformer throws', async (t) => {
  const willThrow = () => () => {
    throw new Error('Transformer error')
  }
  const mapOptions = createMapOptions(schemas, mutations, { willThrow })
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            response: 'response',
            'response.data': [
              'response.data.content.data',
              { $transform: 'willThrow' },
              { $apply: 'account' },
            ],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
      transporter: 'http',
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const expected = {
    ...action.response,
    status: 'error',
    error: 'Error while mutating response: Transformer error',
    origin: 'mutate:response',
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

// Tests -- mutateRequest

test('mutateRequest should set endpoint options and cast and mutate request data', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          mutation: {
            payload: 'payload',
            'payload.data': [
              'payload.data.content.data[].createOrMutate',
              { $apply: 'entry' },
            ],
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret, expectedAction)
})

test('mutateRequest should deep-clone endpoint options', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          options: { untouchable: { touched: false } },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)

  const ret = await service.mutateRequest(action, endpoint!)
  const options = ret.meta?.options as { untouchable: { touched: boolean } }
  options.untouchable.touched = true

  t.false((endpoint?.options.untouchable as { touched: boolean }).touched)
})

test('mutateRequest should authorize data array going to service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateRequest(action, endpoint!)

  const accounts = (ret.payload.data as TypedData).accounts as TypedData[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should authorize data object going to service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
    origin: 'auth:data',
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.is((ret.payload.data as TypedData).accounts, undefined)
  t.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should authorize data array coming from service', async (t) => {
  const isIncoming = true
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
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
  const endpoint = service.endpointFromAction(action, isIncoming)
  const expectedResponse = {
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateRequest(action, endpoint!, isIncoming)

  t.is(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(data[0].$type, 'account')
  t.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should use mutation pipeline', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          mutation: [
            {
              payload: 'payload',
              'payload.data': [
                'payload.data',
                'StupidSoapOperator.StupidSoapEmptyArgs',
                { $alt: [{ $value: {} }] },
              ],
            },
          ],
          options: { uri: 'http://soap.api/1.1' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedData = {
    StupidSoapOperator: { StupidSoapEmptyArgs: {} },
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret.payload.data, expectedData)
})

test('mutateRequest set origin when mutation results in an error response', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          mutation: [
            {
              $flip: true,
              response: {
                status: { $value: 'error' },
              },
            },
          ],
          options: { uri: 'http://soap.api/1.1' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expectedResponse = {
    status: 'error',
    origin: 'mutate:request',
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should return error when transformer throws', async (t) => {
  const willThrow = () => () => {
    throw new Error('Transformer error')
  }
  const mapOptions = createMapOptions(schemas, mutations, { willThrow })
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          mutation: [
            {
              payload: 'payload',
              'payload.data': [
                'payload.data',
                { $transform: 'willThrow' },
                { $alt: [{ $value: {} }] },
              ],
            },
          ],
          options: { uri: 'http://soap.api/1.1' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      castFns,
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = service.endpointFromAction(action)
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: 'Error while mutating request: Transformer error',
      origin: 'mutate:request',
    },
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret, expected)
})

// Tests -- listen

test('listen should call transporter.listen', async (t) => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
  t.is(listenStub.callCount, 1)
  t.is(typeof listenStub.args[0][0], 'function') // We check that the dispatch function is called in the next test
  const connection = listenStub.args[0][1]
  t.truthy(connection)
  t.is(connection.status, 'ok')
})

test('listen should not call transporter.listen when transport.shouldListen returns false', async (t) => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        shouldListen: () => false,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: {},
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = {
    status: 'noaction',
    error: 'Transporter is not configured to listen',
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
  t.is(listenStub.callCount, 0)
})

test('listen should set sourceService', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
    meta: { ident: undefined },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should not set sourceService when already set', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'other' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    type: 'SET',
    payload: { data: [], sourceService: 'other' },
    meta: { ident: undefined },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should support progress reporting', async (t) => {
  const dispatch = (_action: Action | null) =>
    pProgress<Response>(async (setProgress) => {
      setProgress(0.5)
      return { status: 'ok', data: [] }
    })
  const progressStub = sinon.stub()
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      targetService: 'entries',
    },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )

  await service.listen(dispatch)
  const listenerDispatch = listenStub.args[0][0]
  const p = listenerDispatch(action)
  p.onProgress(progressStub)
  const ret = await p

  t.is(ret.status, 'ok')
  t.is(progressStub.callCount, 2)
  t.is(progressStub.args[0][0], 0.5)
  t.is(progressStub.args[1][0], 1)
})

test('listen should authorize incoming action', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], headers: { 'API-TOKEN': 't0k3n' } },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'apiToken' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    ...action,
    payload: { ...action.payload, sourceService: 'entries' },
    meta: { ident: { id: 't0k3n' } },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should respond with error when authentication fails', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], headers: {} }, // No API-TOKEN header will cause the auth to fail
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'apiToken' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedResponse = {
    status: 'autherror',
    error: 'Missing API-TOKEN header',
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 0)
  t.deepEqual(ret, expectedResponse)
})

test('listen should set ident on dispatched actions from options authenticator', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: {
        outgoing: 'granting',
        incoming: {
          id: 'staticAuth',
          authenticator: 'options',
          options: { id: 'reidar' },
        },
      },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
    meta: { ident: { id: 'reidar' } },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should remove ident when no incoming auth is provided', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
    meta: { ident: { id: 'anonymous' } }, // Should be removed
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting' }, // No incoming
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    ...action,
    payload: { ...action.payload, sourceService: 'entries' },
    meta: { ident: undefined },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should not remove ident when auth incoming is true', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
    meta: { ident: { id: 'anonymous' } }, // Should be removed
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { incoming: true },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    ...action,
    payload: { ...action.payload, sourceService: 'entries' },
    meta: { ident: { id: 'anonymous' } },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should not remove ident when auth is true', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
    meta: { ident: { id: 'anonymous' } }, // Should be removed
  }
  const service = new Service(
    {
      id: 'entries',
      auth: true,
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    ...action,
    payload: { ...action.payload, sourceService: 'entries' },
    meta: { ident: { id: 'anonymous' } },
  }
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should return error when connection fails', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: async () => ({ status: 'ok' }),
        connect: async () => ({
          status: 'timeout',
          error: 'Connection attempt timed out',
        }),
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = {
    status: 'error',
    error: "Could not listen to 'entries' service. Failed to connect",
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should return error when authentication fails', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      auth: 'refusing',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({})
  )
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication attempt for 'refusing' was refused.",
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should do nothing when transporter has no listen method', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: undefined,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
    },
    resources
  )
  const expectedResponse = {
    status: 'noaction',
    error: 'Transporter has no listen method',
    origin: 'service:entries',
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
        ...jsonResources.transporters!.http,
        listen: listenStub,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'unknown',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = {
    status: 'error',
    error: "Service 'entries' has no transporter",
    origin: 'internal:service:entries',
  }

  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
})

test('listen should use service middleware', async (t) => {
  const failMiddleware = () => async (_action: Action) => ({
    status: 'badresponse',
  })
  const action = {
    type: 'SET',
    payload: { data: [] },
  }
  let listenDispatch: Dispatch | undefined
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: async (dispatch: Dispatch) => {
          listenDispatch = dispatch
          return { status: 'ok' }
        },
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
    middleware: [failMiddleware],
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expected = {
    status: 'badresponse',
    origin: 'middleware:service:entries',
  }

  await service.listen(dispatch)
  const ret = await listenDispatch!(action)

  t.deepEqual(ret, expected)
})

test('listen should return noaction when incoming action is null', async (t) => {
  let listenDispatch: Dispatch | undefined
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: async (dispatch: Dispatch) => {
          listenDispatch = dispatch
          return { status: 'ok' }
        },
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expected = {
    status: 'noaction',
    error: 'No action was dispatched',
    origin: 'service:entries',
  }

  await service.listen(dispatch)
  const ret = await listenDispatch!(null)

  t.deepEqual(ret, expected)
})

// Tests -- close

test('close should disconnect transporter', async (t) => {
  const disconnectStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        disconnect: disconnectStub,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expected = { status: 'ok' }

  await service.listen(dispatch)
  const ret = await service.close()

  t.deepEqual(ret, expected)
  t.is(disconnectStub.callCount, 1)
  const connection = disconnectStub.args[0][0]
  t.truthy(connection)
  t.is(connection.status, 'ok')
})

test('close should probihit closed connection from behind used again', async (t) => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters!.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        disconnect: async () => undefined,
      },
    },
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'http',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expected = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.listen(dispatch)
  await service.close()
  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expected)
})

test('close should do nothing when no transporter', async (t) => {
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
    castFns,
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: 'granting',
      transporter: 'unknown',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expected = {
    status: 'noaction',
    error: 'No transporter to disconnect',
    origin: 'internal:service:entries',
  }

  const ret = await service.close()

  t.deepEqual(ret, expected)
})

test.todo('should not allow unauthorized access when auth is true')
test.todo('should not allow unauthorized access when auth.outgoing is true')
