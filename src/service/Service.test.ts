/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import sinon from 'sinon'
import pProgress from 'p-progress'
import dispatch from '../tests/helpers/dispatch.js'
import jsonResources from '../tests/helpers/resources/index.js'
import Schema from '../schema/Schema.js'
import Auth from './Auth.js'
import tokenAuth from '../authenticators/token.js'
import optionsAuth from '../authenticators/options.js'
import { isAuthorizedAction, setAuthorizedMark } from './utils/authAction.js'
import { isObject } from '../utils/is.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { ServiceDef, TransporterOptions } from './types.js'
import type {
  Authenticator,
  Connection,
  Action,
  Response,
  TypedData,
  Dispatch,
  Adapter,
} from '../types.js'

import Service, { Resources } from './Service.js'

// Setup

const schemas = new Map()

const accountSchema = new Schema(
  {
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
  },
  schemas
)
schemas.set('account', accountSchema)

const entrySchema = new Schema(
  {
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
  },
  schemas
)
schemas.set('entry', entrySchema)

const sourceSchema = new Schema(
  {
    id: 'source',
    shape: {
      name: 'string',
    },
    access: 'auth',
  },
  schemas
)
schemas.set('source', sourceSchema)

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

const mapOptions = createMapOptions(schemas, mutations)

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
  validate: async (_authentication, _options, _action) => ({
    status: 'ok',
    access: { ident: { id: 'anonymous' } },
  }),
  authentication: {
    asObject: (authentication) =>
      isObject(authentication?.ident) ? authentication!.ident : {},
  },
}

const validateAuth: Authenticator = {
  ...tokenAuth,
  validate: async (_authentication, options, _action) => {
    if (options?.refuse) {
      return { status: 'noaccess', error: 'Refused by authenticator' }
    } else if (options?.invalid) {
      return { status: 'autherror', error: 'Invalidated by authenticator' }
    } else {
      return { status: 'ok', access: { ident: { id: 'johnf' } } }
    }
  },
}

const auths = {
  granting: new Auth('granting', validateAuth, grantingAuth.options),
  refusing: new Auth('refusing', validateAuth, { refuse: true }),
  apiToken: new Auth('apiToken', testAuth, {}),
  validating: new Auth('validating', validateAuth, grantingAuth.options),
  invalidating: new Auth('invalidating', validateAuth, {
    ...grantingAuth.options,
    invalid: true,
  }),
}

const mockResources = (
  data: unknown,
  action: Action = { type: 'GET', payload: {}, meta: {} },
  doValidate = true
): Resources => ({
  ...jsonResources,
  authenticators: {
    options: optionsAuth,
    token: validateAuth,
  },
  transporters: {
    ...jsonResources.transporters,
    http: {
      ...jsonResources.transporters!.http,
      send: async (_action) => ({ status: 'ok', data }),
      listen: async (dispatch, _connection, authenticate) => {
        // This mock implementation of listen() will immediately dispatch the
        // given action. If doValidate is true, it will first authenticate, and
        // set the ident on the response if authentication was successful.
        if (doValidate) {
          const authResponse = await authenticate({ status: 'granted' }, null)
          if (authResponse.status !== 'ok') {
            return authResponse
          }
          const ident = authResponse.access?.ident
          return await dispatch({
            ...action,
            meta: { ...action.meta, ident },
          })
        } else {
          return await dispatch(action)
        }
      },
    },
  },
  mapOptions,
  schemas,
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
    })
  })
})

test('should throw when service references unknown transporter', (t) => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', transporter: 'unknown', endpoints, meta: 'meta' }
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
  }

  const error = t.throws(() => new Service(def, resources))

  t.true(error instanceof Error)
})

test('should throw when auth object references unknown authenticator', async (t) => {
  const def = {
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

  const error = t.throws(() => new Service(def, resources))

  t.true(error instanceof Error)
})

// Tests -- endpointFromAction

test('endpointFromAction should return an endpoint for the action', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapOptions,
      schemas,
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

  const ret = await service.endpointFromAction(action)

  t.truthy(ret)
  t.is(ret?.id, 'endpoint2')
})

test('endpointFromAction should return undefined when no match', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapOptions,
      schemas,
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

  const ret = await service.endpointFromAction(action)

  t.is(ret, undefined)
})

test('endpointFromAction should pick the most specified endpoint', async (t) => {
  const endpoints = [
    {
      id: 'endpoint1',
      match: { type: 'entry' },
      options: { uri: 'http://test.api/1' },
      correct: false,
    },
    {
      id: 'endpoint2',
      match: { type: 'entry', scope: 'member' },
      options: { uri: 'http://test.api/2' },
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
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await service.endpointFromAction(action)

  t.is(ret?.id, 'endpoint2')
})

// Tests -- preflightAction

test('preflightAction should set authorizedByIntegreat (symbol) flag', async (t) => {
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
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { root: true, id: 'root' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.true(isAuthorizedAction(ret))
})

test('preflightAction should authorize action without type', async (t) => {
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
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: { what: 'somethingelse' },
    meta: { ident: { id: 'johnf' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.true(isAuthorizedAction(ret))
})

test('preflightAction should refuse based on schema', async (t) => {
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
      auths,
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
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, role required: 'admin'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.false(isAuthorizedAction(ret))
  t.deepEqual(ret.response, expectedResponse)
})

test('preflightAction should authorize when no auth is specified', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      // No auth
      endpoints,
    },
    {
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.true(isAuthorizedAction(ret))
})

test('preflightAction should not touch action when endpoint validation succeeds', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'account', id: 'acc1' },
    meta: { ident: { root: true, id: 'root' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.is(ret.response, undefined)
  t.is(ret.type, 'GET')
  t.deepEqual(ret.payload, action.payload)
})

test('preflightAction should set error response when validate fails', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' }, // No id
    meta: { ident: { root: true, id: 'root' } },
  }
  const expectedResponse = {
    status: 'badrequest',
    error: 'Did not satisfy condition',
    origin: 'validate:service:accounts:endpoint',
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.deepEqual(ret.response, expectedResponse)
  t.is(ret.type, 'GET')
  t.deepEqual(ret.payload, action.payload)
})

test('preflightAction should authorize before validation', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapOptions,
      schemas,
      auths,
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
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication was refused, role required: 'admin'",
    reason: 'MISSING_ROLE',
    origin: 'auth:action',
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.deepEqual(ret.response, expectedResponse)
  t.is(ret.type, 'GET')
  t.deepEqual(ret.payload, action.payload)
})

test('preflightAction should make auth available to mutations when authInData is true', async (t) => {
  const authInData = true
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      options: { transporter: { authInData } },
      endpoints,
    },
    {
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }
  const expectedAuth = {
    Authorization: 'Bearer t0k3n',
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.is(ret.response?.status, undefined, ret.response?.error)
  t.deepEqual(ret.meta?.auth, expectedAuth)
  t.is(ret.type, 'GET')
  t.deepEqual(ret.payload, action.payload)
  t.true(isAuthorizedAction(ret))
})

test('preflightAction should respond with error when authInData is true and auth fails', async (t) => {
  const authInData = true
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'refusing',
      options: { transporter: { authInData } },
      endpoints,
    },
    {
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(action, endpoint!)

  t.is(ret.response?.status, 'noaccess', ret.response?.error)
  t.is(
    ret.response?.error,
    "Authentication attempt for auth 'refusing' was refused."
  )
  t.is(ret.meta?.auth, undefined)
  t.is(ret.type, 'GET')
  t.deepEqual(ret.payload, action.payload)
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
      transporter: 'http',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
    },
    mockResources(data)
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
    auths,
    middleware: [failMiddleware],
  }
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: true,
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      ident: { id: 'johnf' },
      options: { uri: 'http://some.api/1.0' },
    },
  })
  const expected = {
    status: 'badresponse',
    origin: 'middleware:service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should return error when no connection', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
    },
    mockResources(data)
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const expected = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.close() // Close connection to set it to null
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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const expected = {
    status: 'noaccess',
    error: "Authentication attempt for auth 'refusing' was refused.",
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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
      ...jsonResources,
      auths,
    }
  )
  const action = setAuthorizedMark(
    {
      type: 'GET',
      payload: { id: 'ent1', type: 'entry', source: 'thenews' },
      meta: { ident: { id: 'johnf' } },
    },
    false // Not authorized
  )
  const expected = {
    status: 'autherror',
    error: 'Action has not been authorized by Integreat',
    origin: 'internal:service:entries',
  }

  const ret = await service.send(action)

  t.deepEqual(ret, expected)
})

test('send should provide auth and options', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters!.http, send },
    },
    mapOptions,
    schemas,
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
      options: {
        value: 'Value from service',
        transporter: { secret: 's3cr3t' },
        adapters: { json: { someFlag: true } },
      },
      transporter: 'http',
      auth: 'granting',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  })
  const expected = {
    ...action,
    meta: {
      ...action.meta,
      auth: { Authorization: 'Bearer t0k3n' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  }

  const ret = await service.send(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][0], expected)
})

test('send should not authorize when action has already got meta.auth', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters!.http, send },
    },
    mapOptions,
    schemas,
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
      options: {
        value: 'Value from service',
        transporter: { secret: 's3cr3t' },
        adapters: { json: { someFlag: true } },
      },
      transporter: 'http',
      auth: 'granting',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
      auth: { token: 'ourT0k3n' },
    },
  })
  const expected = {
    ...action,
    meta: {
      ...action.meta,
      auth: { token: 'ourT0k3n' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  }

  const ret = await service.send(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][0], expected)
})

test('send should connect before sending request', async (t) => {
  const connect = async (
    options: TransporterOptions,
    authentication: Record<string, unknown> | null | undefined,
    _connection: Connection | null
  ): Promise<Connection> => ({
    status: 'ok',
    options,
    token: authentication?.Authorization,
  })
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters!.http, connect, send },
    },
    mapOptions,
    schemas,
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
      options: {
        value: 'Value from service',
        transporter: { secret: 's3cr3t' },
        adapters: { json: { someFlag: true } },
      },
      transporter: 'http',
      auth: 'granting',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const expected = {
    status: 'ok',
    options: {
      value: 'Value from service',
      secret: 's3cr3t',
    },
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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
    },
  })

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
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
    },
  })
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
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
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
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    response: {
      status: 'badrequest',
      error: 'Bad request catched early',
      origin: 'mutate:request',
    },
    meta: { ident: { id: 'johnf' } },
  })
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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)

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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)
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

test('mutateResponse should use both service and endpoint adapters', async (t) => {
  const mockAdapter: Adapter = {
    ...jsonResources.adapters!.json, // Borrow methods from json adapter
    async normalize(action, _options) {
      const data = action.response?.data
      return isObject(data)
        ? {
            ...action,
            response: {
              ...action.response,
              // Duplicate data when serializing
              data: { items: [(data.items as any)[0], (data.items as any)[0]] }, // eslint-disable-line @typescript-eslint/no-explicit-any
            },
          }
        : action
    },
  }
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      adapters: ['json'],
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: 'response.data.content',
        },
      },
      endpoints: [
        {
          adapters: ['mock'],
          mutation: {
            $direction: 'from',
            response: {
              $modify: 'response',
              data: ['response.data', { $apply: 'entry' }],
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
      ...jsonResources,
      adapters: {
        ...jsonResources.adapters,
        mock: mockAdapter,
      },
    }
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry', source: 'thenews' },
    response: {
      status: 'ok',
      data: JSON.stringify({
        content: { items: [{ key: 'ent1', header: 'Entry 1' }] },
      }),
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(action)
  const ret = await service.mutateResponse(action, endpoint!)

  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  t.is(data[0].id, 'ent1')
  t.is(data[1].id, 'ent1')
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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)

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
  const endpoint = await service.endpointFromAction(action)
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

test('mutateResponse should return error when transformer throws', async (t) => {
  const willThrow = () => () => () => {
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
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    ...action.response,
    status: 'error',
    error: 'Error while mutating response: Transformer error',
    origin: 'mutate:response',
  }

  const ret = await service.mutateResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

// Tests -- mutateIncomingResponse

test('mutateIncomingResponse should mutate and authorize data in response to incoming request', async (t) => {
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
  const endpoint = await service.endpointFromAction(action)

  const ret = await service.mutateIncomingResponse(action, endpoint!)

  t.is(ret.status, 'ok', ret.error)
  const accounts = (ret.data as TypedData).accounts as TypedData[]
  t.is(accounts.length, 1)
  t.is(accounts[0].id, 'johnf')
  t.is(
    ret.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('mutateIncomingResponse should set origin when mutation results in an error response', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      endpoints: [
        {
          mutation: {
            $flip: true,
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
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'error',
    origin: 'mutate:response:incoming',
  }

  const ret = await service.mutateIncomingResponse(action, endpoint!)

  t.deepEqual(ret, expected)
})

// Tests -- mutateRequest

test('mutateRequest should set endpoint options and cast and mutate request data', async (t) => {
  const theDate = new Date()
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      options: { transporter: { secret: 's3cr3t' } },
      endpoints: [
        {
          mutation: {
            $direction: 'to',
            $flip: true,
            payload: {
              $modify: 'payload',
              'data.content.data[].createOrMutate': [
                'payload.data',
                { $apply: 'entry' },
              ],
              uri: 'meta.options.uri',
            },
            meta: {
              $modify: 'meta',
              options: { $modify: 'meta.options', port: { $value: 3000 } },
            },
          },
          options: { uri: 'http://some.api/1.0' },
        },
      ],
    },
    {
      mapOptions,
      schemas,
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
  const endpoint = await service.endpointFromAction(action)
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
      uri: 'http://some.api/1.0',
    },
    meta: {
      ...action.meta,
      options: {
        secret: 's3cr3t',
        uri: 'http://some.api/1.0',
        port: 3000,
      },
    },
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret, expectedAction)
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
  const endpoint = await service.endpointFromAction(action)
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
  const endpoint = await service.endpointFromAction(action)
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
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(action)
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
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(action)
  const expectedResponse = {
    status: 'error',
    origin: 'mutate:request',
  }

  const ret = await service.mutateRequest(action, endpoint!)

  t.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should return error when transformer throws', async (t) => {
  const willThrow = () => () => () => {
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
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(action)
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

// Tests -- mutateIncomingRequest

test('mutateIncomingRequest should mutate and authorize data coming from service', async (t) => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [
        {
          id: 'endpoint3',
          match: { type: 'account', incoming: true },
          mutation: [
            {
              $direction: 'from',
              payload: {
                $modify: 'payload',
                data: ['payload.data', { $apply: 'account' }],
                uri: 'meta.options.uri',
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
      ],
    },
    {
      mapOptions,
      schemas,
      ...jsonResources,
    }
  )
  const action = setAuthorizedMark({
    type: 'SET',
    payload: {
      type: 'account',
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'lucyk', name: 'Lucy K.' },
        ],
      },
      sourceService: 'accounts',
    },
    meta: {
      ident: { id: 'johnf', roles: ['admin'] },
      options: { uri: 'http://some.api/1.0' }, // This will be set by `dispatch()`
    },
  })
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */
  )
  const expectedResponse = {
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint!)

  t.is(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(data[0].$type, 'account')
  t.deepEqual(ret.response, expectedResponse)
})

test('mutateIncomingRequest should mutate and use type from mutated action to cast items', async (t) => {
  const endpoints = [
    {
      match: { incoming: true },
      mutation: [
        {
          $direction: 'from',
          payload: {
            $modify: 'payload',
            type: { $value: 'account' }, // This type will be used for casting
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
  ]
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
      ...jsonResources,
    }
  )
  const action = setAuthorizedMark({
    type: 'SET',
    payload: {
      // type: 'account',
      data: {
        accounts: [
          { id: 'johnf', name: 'John F.' },
          { id: 'lucyk', name: 'Lucy K.' },
        ],
      },
    },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  })
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */
  )
  const expectedResponse = {
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint!)

  t.is(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
  t.is(data[0].$type, 'account')
  t.deepEqual(ret.response, expectedResponse)
})

test('mutateIncomingRequest should set origin when mutation results in an error response', async (t) => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints: [
        {
          mutation: [
            {
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
      ...jsonResources,
    }
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */
  )
  const expectedResponse = {
    status: 'error',
    origin: 'mutate:request:incoming',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint!)

  t.deepEqual(ret.response, expectedResponse)
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
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
    auths,
    middleware: [failMiddleware],
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
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

test('listen should set sourceService', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [] },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await service.listen(dispatchStub)

  t.is(dispatchStub.callCount, 1)
  t.deepEqual(dispatchStub.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('listen should set sourceService before middleware', async (t) => {
  const sourceServiceMiddleware = () => async (action: Action) => ({
    status: 'ok',
    params: { sourceService: action.payload.sourceService }, // To verify that we got `sourceService`
  })
  const action = {
    type: 'SET',
    payload: { data: [] },
  }
  const resources = {
    ...mockResources({}, action),
    middleware: [sourceServiceMiddleware],
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = {
    status: 'ok',
    params: { sourceService: 'entries' },
  }

  const ret = await service.listen(dispatch)

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
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedAction = {
    type: 'SET',
    payload: { data: [], sourceService: 'other' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = { status: 'ok', access: { ident: { id: 'johnf' } } }

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
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )

  await service.listen(dispatch)
  const listenerDispatch = listenStub.args[0][0]
  const listenerAuthenticate = listenStub.args[0][2]
  const authResponse = await listenerAuthenticate({ status: 'granted' }, action)
  const p = listenerDispatch({
    ...action,
    meta: { ident: authResponse.access?.ident },
  })
  p.onProgress(progressStub)
  const ret = await p

  t.is(ret.status, 'ok', ret.error)
  t.is(progressStub.callCount, 2)
  t.is(progressStub.args[0][0], 0.5)
  t.is(progressStub.args[1][0], 1)
})

test('listen should authenticate action when called back from service', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  t.deepEqual(dispatchedAction.payload, expectedPayload)
  t.is(dispatchedAction.meta?.ident?.id, 'johnf')
})

test('listen should authenticate action with second auth', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: ['refusing', 'validating'] },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  t.deepEqual(dispatchedAction.payload, expectedPayload)
  t.is(dispatchedAction.meta?.ident?.id, 'johnf')
})

test('listen should fall back to ident authenticator on true', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: ['refusing', true] },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'anonymous' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  t.deepEqual(dispatchedAction.payload, expectedPayload)
  t.is(dispatchedAction.meta?.ident?.id, 'anonymous')
})

test('listen should reject authentication when validate() returns an error', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'invalidating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'autherror',
    error: 'Authentication was refused. Invalidated by authenticator',
    origin: 'auth:service:entries:invalidating',
  }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 0)
})

test('listen should reject authentication when second validate() returns an error', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: ['rejecting', 'invalidating'] },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'autherror',
    error: 'Authentication was refused. Invalidated by authenticator',
    origin: 'auth:service:entries:invalidating',
  }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 0)
})

test('listen should authenticate with anonymous when auth is true', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'other' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: true },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true)
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'anonymous' } },
  }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 1)
})

test('listen should remove ident not given by us', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
    meta: { ident: { id: 'conman' } },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, false)
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: undefined },
  }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 1)
})

test('listen should return noaction from authenticate() when no incoming auth', async (t) => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'other' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: true }, // Only outgoing auth is specified
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action)
  )
  const expectedResponse = {
    status: 'noaction',
    error:
      "Could not authenticate. Service 'entries' has no incoming authenticator",
    origin: 'auth:service:entries',
  }

  const ret = await service.listen(dispatchStub)

  t.deepEqual(ret, expectedResponse)
  t.is(dispatchStub.callCount, 0)
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
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
      auth: { outgoing: 'refusing', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({})
  )
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication attempt for auth 'refusing' was refused.",
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: { outgoing: 'granting', incoming: 'validating' },
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

test('listen should return error when no connection', async (t) => {
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources
  )
  const expectedResponse = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.close() // Closing will set the connection to null
  const ret = await service.listen(dispatch)

  t.deepEqual(ret, expectedResponse)
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
    auths,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'validating' },
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

test('close should just return ok when no connection', async (t) => {
  const resources = {
    ...jsonResources,
    mapOptions,
    schemas,
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
  const expected = { status: 'ok' }

  await service.close() // Closing will set the connection to null
  const ret = await service.close()

  t.deepEqual(ret, expected)
})

test.todo('should not allow unauthorized access when auth is true')
test.todo('should not allow unauthorized access when auth.outgoing is true')
