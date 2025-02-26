import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import pProgress from 'p-progress'
import mapTransform from 'map-transform'
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
import {
  Authenticator,
  Connection,
  Action,
  Response,
  TypedData,
  Dispatch,
  HandlerDispatch,
  Adapter,
  IdentType,
  Transporter,
} from '../types.js'
import type Endpoint from './Endpoint.js'

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
  schemas,
)
schemas.set('account', accountSchema)

const entrySchema = new Schema(
  {
    id: 'entry',
    plural: 'entries',
    generateId: true,
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
  schemas,
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
  schemas,
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
const identConfig = { type: 'account' }

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
  async authenticate(_options, action, _dispatch) {
    const id = action?.payload.headers && action?.payload.headers['API-TOKEN']
    return id
      ? { status: 'granted', ident: { id } }
      : { status: 'rejected', error: 'Missing API-TOKEN header' }
  },
  isAuthenticated: (_authentication, _action, _dispatch) => false,
  validate: async (_authentication, _options, _action, _dispatch) => ({
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }),
  authentication: {
    asObject: (authentication) =>
      isObject(authentication?.ident) ? authentication?.ident : {},
  },
}

async function isOkAfterDispatch(dispatch: HandlerDispatch) {
  const response = await dispatch({ type: 'GET', payload: { type: 'session' } })
  return response.status === 'ok'
}

const dispatchAuth: Authenticator = {
  async authenticate(_options, _action, dispatch) {
    return (await isOkAfterDispatch(dispatch))
      ? { status: 'granted', ident: { id: 'user', type: IdentType.Custom } }
      : { status: 'rejected', error: 'Dispatch failed' }
  },
  isAuthenticated: (_authentication, _action) => false,
  validate: async (_authentication, _options, _action, dispatch) =>
    (await isOkAfterDispatch(dispatch))
      ? {
          status: 'ok',
          access: { ident: { id: 'anonymous', type: IdentType.Anon } },
        }
      : { status: 'rejected', error: 'Dispatch failed' },
  authentication: {
    asObject: (authentication) =>
      isObject(authentication?.ident) ? authentication?.ident : {},
    asHttpHeaders: (authentication) =>
      isObject(authentication?.ident) ? authentication?.ident : {},
  },
}

const validateAuth: Authenticator = {
  ...tokenAuth,
  validate: async (_authentication, options, _action, _dispatch) => {
    if (options?.refuse) {
      return { status: 'noaccess', error: 'Refused by authenticator' }
    } else if (options?.invalid) {
      return {
        status: 'autherror',
        error: 'Invalidated by authenticator',
        reason: 'becauseisayso',
      }
    } else if (options?.withToken || options?.withTokens) {
      return {
        status: 'ok',
        access: {
          ident: {
            withToken: options.withTokens
              ? ['validator|johnf']
              : 'validator|johnf',
          },
        },
      }
    } else {
      return { status: 'ok', access: { ident: { id: 'johnf' } } }
    }
  },
}

const auths = {
  granting: new Auth('granting', validateAuth, grantingAuth.options),
  refusing: new Auth('refusing', validateAuth, { refuse: true }),
  apiToken: new Auth('apiToken', testAuth, {}),
  dispatch: new Auth('dispatch', dispatchAuth, grantingAuth.options),
  validating: new Auth('validating', validateAuth, grantingAuth.options),
  invalidating: new Auth('invalidating', validateAuth, {
    ...grantingAuth.options,
    invalid: true,
  }),
  withToken: new Auth('withToken', validateAuth, {
    ...grantingAuth.options,
    withToken: true,
  }),
  withTokens: new Auth('withTokens', validateAuth, {
    ...grantingAuth.options,
    withTokens: true,
  }),
}

const mockResources = (
  data: unknown,
  action: Action = { type: 'GET', payload: {}, meta: {} },
  doValidate = true,
): Resources => ({
  ...jsonResources,
  authenticators: {
    options: optionsAuth,
    token: validateAuth,
  },
  transporters: {
    ...jsonResources.transporters,
    http: {
      ...jsonResources.transporters?.http,
      send: async (_action) => ({ status: 'ok', data }),
      listen: async (dispatch, _connection, authenticate) => {
        // This mock implementation of listen() will immediately dispatch the
        // given action. If doValidate is true, it will first authenticate, and
        // set the ident on the response if authentication was successful.
        if (doValidate) {
          const authResponse = await authenticate({ status: 'granted' }, action)
          const ident = authResponse.access?.ident
          return await dispatch({
            ...action,
            ...(authResponse.status !== 'ok' ? { response: authResponse } : {}),
            meta: { ...action.meta, ident },
          })
        } else {
          return await dispatch(action)
        }
      },
    } as Transporter,
  },
  mapTransform,
  mapOptions,
  schemas,
  auths,
})

// Tests

test('should return service object with id and meta', () => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', transporter: 'http', endpoints, meta: 'meta' }

  const service = new Service(def, {
    ...jsonResources,
    identConfig,
    mapTransform,
    mapOptions,
    schemas,
  })

  assert.equal(service.id, 'entries')
  assert.equal(service.meta, 'meta')
})

test('should throw when no id', () => {
  assert.throws(() => {
    new Service({ transporter: 'http' } as unknown as ServiceDef, {
      ...jsonResources,
      mapTransform,
      mapOptions,
      schemas,
    })
  })
})

test('should throw when service references unknown transporter', () => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', transporter: 'unknown', endpoints, meta: 'meta' }
  const resources = {
    ...jsonResources,
    mapTransform,
    mapOptions,
    schemas,
  }
  const expectedError = { name: 'TypeError' }

  assert.throws(() => new Service(def, resources), expectedError)
})

test('should throw when service references unknown adapters', () => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = {
    id: 'entries',
    transporter: 'http',
    adapters: ['unknown'],
    endpoints,
    meta: 'meta',
  }
  const resources = {
    ...jsonResources,
    mapTransform,
    mapOptions,
    schemas,
  }
  const expectedError = { name: 'TypeError' }

  assert.throws(() => new Service(def, resources), expectedError)
})

test('should throw when endpoint references unknown adapters', () => {
  const endpoints = [
    {
      id: 'endpoint1',
      adapters: ['unknown'],
      options: { uri: 'http://some.api/1.0' },
    },
  ]
  const def = {
    id: 'entries',
    transporter: 'http',
    endpoints,
    meta: 'meta',
  }
  const resources = {
    ...jsonResources,
    mapTransform,
    mapOptions,
    schemas,
  }
  const expectedError = { name: 'TypeError' }

  assert.throws(() => new Service(def, resources), expectedError)
})

test('should throw when auth object references unknown authenticator', async () => {
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
  const expectedError = { name: 'Error' }

  assert.throws(() => new Service(def, resources), expectedError)
})

// Tests -- endpointFromAction

test('endpointFromAction should return an endpoint for the action', async () => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  assert.equal(ret?.id, 'endpoint2')
})

test('endpointFromAction should return undefined when no match', async () => {
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: {
      type: 'unknown',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await service.endpointFromAction(action)

  assert.equal(ret, undefined)
})

test('endpointFromAction should pick the most specified endpoint', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await service.endpointFromAction(action)

  assert.equal(ret?.id, 'endpoint2')
})

// Tests -- preflightAction

test('preflightAction should set authorizedByIntegreat (symbol) flag', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(isAuthorizedAction(ret), true)
})

test('preflightAction should authorize action without type', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'SET',
    payload: { what: 'somethingelse' },
    meta: { ident: { id: 'johnf' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(isAuthorizedAction(ret), true)
})

test('preflightAction should refuse based on schema', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
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
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(isAuthorizedAction(ret), false)
  assert.deepEqual(ret.response, expectedResponse)
})

test('preflightAction should authorize when no auth is specified', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      // No auth
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(isAuthorizedAction(ret), true)
})

test('preflightAction should not touch action when endpoint validation succeeds', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'account', id: 'acc1' },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(ret.response, undefined)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
})

test('preflightAction should set error response when validate fails', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' }, // No id
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }
  const expectedResponse = {
    status: 'badrequest',
    error: 'Did not satisfy condition',
    origin: 'validate:service:accounts:endpoint',
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.deepEqual(ret.response, expectedResponse)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
})

test('preflightAction should authorize before validation', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints: [{ ...endpoints[3], validate: [{ condition: 'payload.id' }] }],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
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
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.deepEqual(ret.response, expectedResponse)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
})

test('preflightAction should make auth available to mutations when authInData is true', async () => {
  const authInData = true
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'dispatch',
      options: { transporter: { authInData } },
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }
  const expectedAuth = { id: 'user', type: IdentType.Custom } // The auth returns the ident

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(ret.response?.status, undefined, ret.response?.error)
  assert.deepEqual(ret.meta?.auth, expectedAuth)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
  assert.equal(isAuthorizedAction(ret), true)
})

test('preflightAction should use auth from endpoint when available', async () => {
  const authInData = true
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'refusing',
      options: { transporter: { authInData } },
      endpoints: [{ ...endpoints[3], auth: 'granting' }],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
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
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(ret.response?.status, undefined, ret.response?.error)
  assert.deepEqual(ret.meta?.auth, expectedAuth)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
  assert.equal(isAuthorizedAction(ret), true)
})

test('preflightAction should respond with error when authInData is true and auth fails', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      auths,
      ...jsonResources,
    },
  )
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  }

  const endpoint = await service.endpointFromAction(action)
  const ret = await service.preflightAction(
    action,
    endpoint as Endpoint,
    dispatch,
  )

  assert.equal(ret.response?.status, 'noaccess', ret.response?.error)
  assert.equal(
    ret.response?.error,
    "Authentication attempt for auth 'refusing' was refused.",
  )
  assert.equal(ret.meta?.auth, undefined)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
})

// Tests -- send

test('send should retrieve data from service', async () => {
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
      auth: 'dispatch',
    },
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = { status: 'ok', data }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should use service middleware', async () => {
  const failMiddleware = () => async (_action: Action) => ({
    status: 'badresponse',
  })
  const resources = {
    ...jsonResources,
    mapTransform,
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
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      ident: { id: 'johnf' },
      options: { uri: 'http://some.api/1.0' },
    },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'badresponse',
    origin: 'middleware:service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should return error when no connection', async () => {
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
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.close() // Close connection to set it to null
  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should try to authenticate and return with error when it fails', async () => {
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
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'noaccess',
    error: "Authentication attempt for auth 'refusing' was refused.",
    origin: 'service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should authenticate with auth id on `outgoing` prop', async () => {
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
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = { status: 'ok', data }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should authenticate with auth def', async () => {
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
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = { status: 'ok', data }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should authenticate with auth def on `outgoing` prop', async () => {
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
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = { status: 'ok', data }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should authenticate with auth from endpoint', async () => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [
        {
          options: { uri: 'http://some.api/1.0' },
          auth: { outgoing: 'granting' },
        },
      ],
      auth: { outgoing: 'refusing' },
      transporter: 'http',
    },
    mockResources(data),
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = { status: 'ok', data }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should fail when not authorized', async () => {
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      auth: 'granting',
      transporter: 'http',
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
      auths,
    },
  )
  const action = setAuthorizedMark(
    {
      type: 'GET',
      payload: { id: 'ent1', type: 'entry', source: 'thenews' },
      meta: { ident: { id: 'johnf' } },
    },
    false, // Not authorized
  )
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'autherror',
    error: 'Action has not been authorized by Integreat',
    origin: 'internal:service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should provide auth, options, and targetService', async () => {
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters?.http, send } as Transporter,
    },
    mapTransform,
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
    resources,
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
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    type: 'GET',
    payload: {
      ...action.payload,
      targetService: 'entries',
    },
    meta: {
      ...action.meta,
      auth: { Authorization: 'Bearer t0k3n' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  assert.deepEqual(send.args[0][0], expected)
})

test('send should not set targetService when doSetTargetService is false', async () => {
  const doSetTargetService = false
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters?.http, send } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
    auths,
  }
  const service = new Service(
    {
      id: 'queue', // Should not set this id
      endpoints: [{}],
      options: {},
      transporter: 'http',
      auth: 'granting',
    },
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      source: 'thenews',
      targetService: 'entries',
    },
    meta: {
      ident: { id: 'johnf' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  })
  const endpoint = await service.endpointFromAction(action)
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

  const ret = await service.send(
    action,
    endpoint as Endpoint,
    dispatch,
    doSetTargetService,
  )

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  assert.deepEqual(send.args[0][0], expected)
})

test('send should not set targetService when doSetTargetService is false in meta options', async () => {
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters?.http, send } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
    auths,
  }
  const service = new Service(
    {
      id: 'queue', // Should not set this id
      endpoints: [{}],
      options: {},
      transporter: 'http',
      auth: 'granting',
    },
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      source: 'thenews',
      targetService: 'entries',
    },
    meta: {
      ident: { id: 'johnf' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
        doSetTargetService: false,
      },
    },
  })
  const endpoint = await service.endpointFromAction(action)
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

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  assert.deepEqual(send.args[0][0], expected)
})

test('send should not authorize when action has already got meta.auth', async () => {
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: { ...jsonResources.transporters?.http, send } as Transporter,
    },
    mapTransform,
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
    resources,
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
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    type: 'GET',
    payload: { ...action.payload, targetService: 'entries' },
    meta: {
      ...action.meta,
      auth: { token: 'ourT0k3n' },
      options: {
        uri: 'http://some.api/1.0',
        secret: 's3cr3t',
      },
    },
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  assert.deepEqual(send.args[0][0], expected)
})

test('send should connect before sending request', async () => {
  const connect = async (
    options: TransporterOptions,
    authentication: Record<string, unknown> | null | undefined,
    _connection: Connection | null,
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
      http: {
        ...jsonResources.transporters?.http,
        connect,
        send,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'ok',
    options: {
      value: 'Value from service',
      secret: 's3cr3t',
    },
    token: 'Bearer t0k3n',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(send.callCount, 1)
  assert.deepEqual(send.args[0][1], expected)
})

test('send should store connection', async () => {
  const connect = sinon.stub().returns({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        connect,
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
    },
  })
  const endpoint = await service.endpointFromAction(action)

  await service.send(action, endpoint as Endpoint, dispatch)
  await service.send(action, endpoint as Endpoint, dispatch)

  assert.equal(connect.callCount, 2)
  assert.deepEqual(connect.args[0][2], null)
  assert.deepEqual(connect.args[1][2], { status: 'ok' })
})

test('send should return error when connection fails', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        connect: async () => ({ status: 'notfound', error: 'Not found' }),
        send: async (_action: Action) => ({ status: 'ok', data: {} }),
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: {
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
    },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'error',
    error: "Could not connect to service 'entries'. [notfound] Not found",
    origin: 'service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should pass on error response from service', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        send: async (_action: Action) => ({
          status: 'badrequest',
          error: 'Real bad request',
        }),
      } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'badrequest',
    error: 'Real bad request',
    origin: 'service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should pass on error response from service and prefix origin', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        send: async (_action: Action) => ({
          status: 'badrequest',
          error: 'Real bad request',
          origin: 'somewhere',
        }),
      } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'badrequest',
    error: 'Real bad request',
    origin: 'service:entries:somewhere',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should return with error when transport throws', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        send: async (_action: Action) => {
          throw new Error('We did not expect this')
        },
      } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources,
  )
  const action = setAuthorizedMark({
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', source: 'thenews' },
    meta: { ident: { id: 'johnf' } },
  })
  const endpoint = await service.endpointFromAction(action)
  const expected = {
    status: 'error',
    error: "Error retrieving from service 'entries': We did not expect this",
    origin: 'service:entries',
  }

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

test('send should do nothing when action has a response', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        send: async (_action: Action) => ({
          status: 'error',
          error: 'Should not be called',
        }),
      } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
  }
  const service = new Service(
    {
      id: 'entries',
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
      transporter: 'http',
    },
    resources,
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
  const endpoint = await service.endpointFromAction(action)
  const expected = action.response

  const ret = await service.send(action, endpoint as Endpoint, dispatch)

  assert.deepEqual(ret, expected)
})

// Tests -- mutateResponse

test('mutateResponse should mutate data array from service', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should mutate data object from service', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  const data = ret.data as TypedData
  assert.equal(Array.isArray(data), false)
  assert.equal(data.id, 'johnf')
  assert.equal(data.$type, 'account')
})

test('mutateResponse should not use defaults when castWithoutDefaults is true', async () => {
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
          castWithoutDefaults: true,
        },
      ],
      transporter: 'http',
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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
                header: 'Entry 1',
                two: 2,
              },
            ],
          },
        },
      },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(action)

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  const data = ret.data as TypedData[]
  assert.equal(data[0].id, null)
  assert.equal(data[0].createdAt, undefined)
  assert.equal(data[0].updatedAt, undefined)
  assert.equal(data[0].one, undefined)
})

test('mutateResponse should set origin when mutation results in an error response', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should use service adapters', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should use endpoint adapters', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should use both service and endpoint adapters', async () => {
  const mockAdapter: Adapter = {
    ...(jsonResources.adapters?.json as Adapter), // Borrow methods from json adapter
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
      adapters: {
        ...jsonResources.adapters,
        mock: mockAdapter,
      },
    },
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
  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  const data = ret.data as TypedData[]
  assert.equal(data.length, 2)
  assert.equal(data[0].id, 'ent1')
  assert.equal(data[1].id, 'ent1')
})

test('mutateResponse should not cast data array from service when allowRawResponse is true', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should mutate null to undefined', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('should authorize typed data in array from service', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.equal(ret.status, 'ok')
  const data = ret.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'johnf')
  assert.equal(
    ret.warning,
    '1 item was removed from response data due to lack of access',
  )
})

test('should authorize typed data object from service', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

test('mutateResponse should return error when transformer throws', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

// Tests -- mutateIncomingResponse

test('mutateIncomingResponse should mutate and authorize data in response to incoming request', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateIncomingResponse(action, endpoint as Endpoint)

  assert.equal(ret.status, 'ok', ret.error)
  const accounts = (ret.data as TypedData).accounts as TypedData[]
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].id, 'johnf')
  assert.equal(
    ret.warning,
    '1 item was removed from response data due to lack of access',
  )
})

test('mutateIncomingResponse should set origin when mutation results in an error response', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateIncomingResponse(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

// Tests -- mutateRequest

test('mutateRequest should set endpoint options and cast and mutate request data', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  assert.deepEqual(ret, expectedAction)
})

test('mutateRequest should authorize data array going to service', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  const accounts = (ret.payload.data as TypedData).accounts as TypedData[]
  assert.equal(accounts.length, 1)
  assert.equal(accounts[0].id, 'johnf')
  assert.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should authorize data object going to service', async () => {
  const service = new Service(
    {
      id: 'accounts',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  assert.equal((ret.payload.data as TypedData).accounts, undefined)
  assert.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should use mutation pipeline', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  assert.deepEqual(ret.payload.data, expectedData)
})

test('mutateRequest set origin when mutation results in an error response', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  assert.deepEqual(ret.response, expectedResponse)
})

test('mutateRequest should return error when transformer throws', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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

  const ret = await service.mutateRequest(action, endpoint as Endpoint)

  assert.deepEqual(ret, expected)
})

// Tests -- mutateIncomingRequest

test('mutateIncomingRequest should mutate and authorize data coming from service', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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
    true /* isIncoming */,
  )
  const expectedResponse = {
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.equal(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'johnf')
  assert.equal(data[0].$type, 'account')
  assert.deepEqual(ret.response, expectedResponse)
})

test('mutateIncomingRequest should mutate and use type from mutated action to cast items', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
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
    true /* isIncoming */,
  )
  const expectedResponse = {
    status: undefined,
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.equal(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  assert.equal(data.length, 1)
  assert.equal(data[0].id, 'johnf')
  assert.equal(data[0].$type, 'account')
  assert.deepEqual(ret.response, expectedResponse)
})

test('mutateIncomingRequest should not use defaults when castWithoutDefaults is true', async () => {
  const endpoints = [
    {
      match: { incoming: true },
      mutation: [
        {
          $direction: 'from',
          payload: {
            $modify: 'payload',
            type: { $value: 'entry' }, // This type will be used for casting
            data: ['payload.data', { $apply: 'entry' }],
          },
        },
      ],
      options: { uri: 'http://some.api/1.0' },
      castWithoutDefaults: true,
    },
  ]
  const service = new Service(
    {
      id: 'entries',
      transporter: 'http',
      auth: 'granting',
      endpoints,
    },
    { mapTransform, mapOptions, schemas, ...jsonResources },
  )
  const action = setAuthorizedMark({
    type: 'SET',
    payload: {
      data: {
        items: [{ header: 'Entry 1' }],
      },
    },
    meta: { ident: { id: 'johnf', roles: ['admin'] } },
  })
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */,
  )

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.equal(ret.response?.status, undefined, ret.response?.error)
  const data = ret.payload.data as TypedData[]
  assert.equal(data[0].id, null)
  assert.equal(data[0].title, 'Entry 1')
  assert.equal(data[0].createdAt, undefined)
  assert.equal(data[0].updatedAt, undefined)
  assert.equal(data[0].one, undefined)
})

test('mutateIncomingRequest should keep ident, id, cid, and gid even when mutation removes them', async () => {
  const service = new Service(
    {
      id: 'api',
      transporter: 'http',
      auth: 'granting',
      endpoints: [
        {
          id: 'endpoint3',
          match: { action: 'SET', incoming: true },
          mutation: [
            {
              $direction: 'from',
              type: { $value: 'RUN' },
              payload: {
                jobId: { $value: 'theJob' },
              },
              meta: { queue: { $value: true } }, // This will remove ids, ident etc.
            },
          ],
        },
      ],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
  )
  const action = setAuthorizedMark({
    type: 'SET',
    payload: {
      path: '/runTheJob',
      sourceService: 'api',
    },
    meta: {
      id: '12345',
      cid: '12346',
      gid: '12347',
      ident: { id: 'johnf', roles: ['admin'] },
      options: { uri: 'http://some.api/1.0' },
    },
  })
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */,
  )
  const expectedMeta = {
    id: '12345',
    cid: '12346',
    gid: '12347',
    ident: { id: 'johnf', roles: ['admin'] },
    queue: true,
  }

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.equal(ret.type, 'RUN')
  assert.deepEqual(ret.meta, expectedMeta)
})

test('mutateIncomingRequest should allow mutation to override ident, id, cid, and gid', async () => {
  const service = new Service(
    {
      id: 'api',
      transporter: 'http',
      auth: 'granting',
      endpoints: [
        {
          id: 'endpoint3',
          match: { action: 'SET', incoming: true },
          mutation: [
            {
              $direction: 'from',
              type: { $value: 'RUN' },
              payload: {
                jobId: { $value: 'theJob' },
              },
              meta: {
                id: { $value: '14' },
                cid: { $value: '15' },
                gid: { $value: '16' },
                ident: { id: { $value: 'mysteryUser' } },
              },
            },
          ],
        },
      ],
    },
    {
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
  )
  const action = setAuthorizedMark({
    type: 'SET',
    payload: {
      path: '/runTheJob',
      sourceService: 'api',
    },
    meta: {
      id: '12345',
      cid: '12346',
      gid: '12347',
      ident: { id: 'johnf', roles: ['admin'] },
      options: { uri: 'http://some.api/1.0' },
    },
  })
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */,
  )
  const expectedMeta = {
    id: '14',
    cid: '15',
    gid: '16',
    ident: { id: 'mysteryUser' },
  }

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.equal(ret.type, 'RUN')
  assert.deepEqual(ret.meta, expectedMeta)
})

test('mutateIncomingRequest should set origin when mutation results in an error response', async () => {
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
      mapTransform,
      mapOptions,
      schemas,
      ...jsonResources,
    },
  )
  const action = {
    type: 'SET',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const endpoint = await service.endpointFromAction(
    action,
    true /* isIncoming */,
  )
  const expectedResponse = {
    status: 'error',
    origin: 'mutate:request:incoming',
  }

  const ret = await service.mutateIncomingRequest(action, endpoint as Endpoint)

  assert.deepEqual(ret.response, expectedResponse)
})

// Tests -- listen

test('listen should call transporter.listen and set listen flag', async () => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const emit = () => undefined
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: listenStub,
      } as Transporter,
    },
    mapTransform,
    mapOptions,
    schemas,
    auths,
    emit,
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'dispatch', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    resources,
  )
  const expectedResponse = { status: 'ok' }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(listenStub.callCount, 1)
  assert.equal(typeof listenStub.args[0][0], 'function') // We check that the dispatch function is called in another test
  const connection = listenStub.args[0][1]
  assert.equal(connection.status, 'ok')
  assert.equal(typeof listenStub.args[0][2], 'function') // We check that the authentication callback is called in another test
  assert.equal(listenStub.args[0][3], emit)
  assert.equal(service.isListening, true)
})

test('listen should not call transporter.listen when transport.shouldListen returns false', async () => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        shouldListen: () => false,
        listen: listenStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expectedResponse = {
    status: 'noaction',
    warning: 'Transporter is not configured to listen',
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(listenStub.callCount, 0)
  assert.equal(service.isListening, false)
})

test('listen should use service middleware', async () => {
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
        ...jsonResources.transporters?.http,
        listen: async (dispatch: Dispatch) => {
          listenDispatch = dispatch
          return { status: 'ok' }
        },
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = {
    status: 'badresponse',
    origin: 'middleware:service:entries',
  }

  await service.listen(dispatch)
  const ret = await listenDispatch?.(action)

  assert.deepEqual(ret, expected)
})

test('listen should set sourceService, id, and cid', async () => {
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
    mockResources({}, action),
  )
  const expectedPayload = { data: [], sourceService: 'entries' }
  const expectedResponse = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await service.listen(dispatchStub)

  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.equal(dispatchedAction.type, 'SET')
  assert.deepEqual(dispatchedAction.payload, expectedPayload)
  assert.deepEqual(dispatchedAction.meta.ident, { id: 'johnf' })
  assert.equal(dispatchedAction.meta.auth, undefined)
  assert.equal(typeof dispatchedAction.meta.id, 'string')
  assert.equal(dispatchedAction.meta.id.length, 21)
  assert.equal(dispatchedAction.meta.cid, dispatchedAction.meta.id)
  assert.deepEqual(ret, expectedResponse)
})

test('listen should set sourceService before middleware', async () => {
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
    resources,
  )
  const expectedResponse = {
    status: 'ok',
    params: { sourceService: 'entries' },
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
})

test('listen should override existing sourceService', async () => {
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
    mockResources({}, action),
  )
  const expectedResponse = { status: 'ok', access: { ident: { id: 'johnf' } } }

  const ret = await service.listen(dispatchStub)

  assert.equal(dispatchStub.callCount, 1)
  assert.equal(dispatchStub.args[0][0].payload.sourceService, 'entries')
  assert.deepEqual(ret, expectedResponse)
})

test('should support progress reporting', async () => {
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
        ...jsonResources.transporters?.http,
        listen: listenStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
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

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(progressStub.callCount, 2)
  assert.equal(progressStub.args[0][0], 0.5)
  assert.equal(progressStub.args[1][0], 1)
})

test('listen should authenticate action when called back from service', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.deepEqual(dispatchedAction.payload, expectedPayload)
  assert.equal(dispatchedAction.meta?.ident?.id, 'johnf')
})

test('listen should authenticate action with second auth', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.deepEqual(dispatchedAction.payload, expectedPayload)
  assert.equal(dispatchedAction.meta?.ident?.id, 'johnf')
})

test('listen should fall back to ident authenticator on true', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }
  const expectedActionIdent = { id: 'anonymous', type: IdentType.Anon }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.deepEqual(dispatchedAction.payload, expectedPayload)
  assert.deepEqual(dispatchedAction.meta?.ident, expectedActionIdent)
})

test('listen should complete ident in authenticate callback', async () => {
  const dispatchStub = sinon
    .stub()
    .callsFake(dispatch)
    .onCall(0)
    .resolves({
      status: 'ok',
      access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
    })
  const identConfig = { type: 'account', completeIdent: true }
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
    { ...mockResources({}, action, true), identConfig },
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf', roles: ['editor'], isCompleted: true } },
  }
  const expectedGetIdentAction = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' }, cache: true },
  }
  const expectedIdent = { id: 'johnf', roles: ['editor'], isCompleted: true }

  const ret = await service.listen(dispatchStub)

  assert.equal(dispatchStub.callCount, 2)
  assert.deepEqual(dispatchStub.args[0][0], expectedGetIdentAction)
  assert.deepEqual(dispatchStub.args[1][0].meta.ident, expectedIdent)
  assert.deepEqual(ret, expectedResponse)
})

test('listen should respond with noaccess when ident is not found', async () => {
  const dispatchStub = sinon
    .stub()
    .callsFake(dispatch)
    .onCall(0)
    .resolves({ status: 'notfound', error: 'Could not find ident' })
  const identConfig = { type: 'account', completeIdent: true }
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
    { ...mockResources({}, action, true), identConfig },
  )
  const expectedResponse = {
    status: 'noaccess',
    error: "Ident 'johnf' was not found. [notfound] Could not find ident",
    reason: 'unknownident',
    origin: 'auth:service:entries:auth:ident',
  }
  const expectedGetIdentAction = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' }, cache: true },
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 2)
  assert.deepEqual(dispatchStub.args[0][0], expectedGetIdentAction)
  assert.equal(dispatchStub.args[1][0].meta.ident, undefined)
})

test('listen should authenticate action with endpoint auth', async () => {
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
      endpoints: [
        {
          match: { incoming: true },
          options: { uri: 'http://some.api/1.0' },
          auth: { incoming: 'validating' },
        },
      ],
    },
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'johnf' } },
  }
  const expectedPayload = { ...action.payload, sourceService: 'entries' }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.deepEqual(dispatchedAction.payload, expectedPayload)
  assert.equal(dispatchedAction.meta?.ident?.id, 'johnf')
})

test('listen should reject authentication when validate() returns an error', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'autherror',
    error: 'Authentication was refused. Invalidated by authenticator',
    reason: 'becauseisayso',
    origin: 'auth:service:entries:invalidating',
  }

  const ret = await service.listen(dispatchStub)

  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.deepEqual(dispatchedAction.response, expectedResponse)
  assert.equal(dispatchedAction.meta.ident, undefined)
  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, false)
})

test('listen should pass on dispatch to auth callback', async () => {
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'dispatch' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, true)
})

test('listen should reject authentication when second validate() returns an error', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'autherror',
    error: 'Authentication was refused. Invalidated by authenticator',
    reason: 'becauseisayso',
    origin: 'auth:service:entries:invalidating',
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  assert.equal(service.isListening, false)
})

test('listen should accept an incoming ident with withTokens only', async () => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'withToken' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { withToken: 'validator|johnf' } }, // This ident will be completed by the `completeIdent` middleware when used
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
})

test('listen should accept an incoming ident with withTokens array', async () => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: 'withTokens' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { withToken: ['validator|johnf'] } }, // This ident will be completed by the `completeIdent` middleware when used
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
})

test('listen should authenticate with anonymous when auth is true', async () => {
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
    mockResources({}, action, true),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: { id: 'anonymous', type: IdentType.Anon } },
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
})

test('listen should remove ident not given by us', async () => {
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
    mockResources({}, action, false),
  )
  const expectedResponse = {
    status: 'ok',
    access: { ident: undefined },
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
})

test('listen should remove incoming auth on meta', async () => {
  const dispatchStub = sinon.stub().callsFake(dispatch)
  const action = {
    type: 'SET',
    payload: { data: [], sourceService: 'entries' },
    meta: { auth: { token: 'h4ck1n6!' } },
  }
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'granting', incoming: true },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}, action, true),
  )

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret.status, 'ok', ret.error)
  assert.equal(dispatchStub.callCount, 1)
  const dispatchedAction = dispatchStub.args[0][0]
  assert.equal(dispatchedAction.meta?.auth, undefined)
})

test('listen should return noaction from authenticate() when no incoming auth', async () => {
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
    mockResources({}, action),
  )
  const expectedResponse = {
    status: 'noaction',
    warning:
      "Could not authenticate. Service 'entries' has no incoming authenticator",
    origin: 'auth:service:entries',
  }

  const ret = await service.listen(dispatchStub)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(dispatchStub.callCount, 1)
  assert.equal(service.isListening, false)
})

test('listen should return error when connection fails', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }),
        connect: async () => ({
          status: 'timeout',
          error: 'Connection attempt timed out',
        }),
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expectedResponse = {
    status: 'error',
    error: "Could not listen to 'entries' service. Failed to connect",
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, false)
})

test('listen should return error when authentication fails', async () => {
  const service = new Service(
    {
      id: 'entries',
      auth: { outgoing: 'refusing', incoming: 'validating' },
      transporter: 'http',
      options: { incoming: { port: 8080 } },
      endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    },
    mockResources({}),
  )
  const expectedResponse = {
    status: 'noaccess',
    error: "Authentication attempt for auth 'refusing' was refused.",
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, false)
})

test('listen should do nothing when transporter has no listen method', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: undefined,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expectedResponse = {
    status: 'noaction',
    warning: 'Transporter has no listen method',
    origin: 'service:entries',
  }

  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, false)
})

test('listen should return error when no connection', async () => {
  const listenStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: listenStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expectedResponse = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.close() // Closing will set the connection to null
  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expectedResponse)
  assert.equal(service.isListening, false)
})

test('listen should return noaction when incoming action is null', async () => {
  let listenDispatch: Dispatch | undefined
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async (dispatch: Dispatch) => {
          listenDispatch = dispatch
          return { status: 'ok' }
        },
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = {
    status: 'noaction',
    error: 'No action was dispatched',
    origin: 'service:entries',
  }

  await service.listen(dispatch)
  const ret = await listenDispatch?.(null)

  assert.deepEqual(ret, expected)
})

// Tests -- stopListening

test('stopListening should stop listening to transporter', async () => {
  const stopListeningStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        stopListening: stopListeningStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = { status: 'ok' }

  await service.listen(dispatch)
  const ret = await service.stopListening()

  assert.deepEqual(ret, expected)
  assert.equal(stopListeningStub.callCount, 1)
  const connection = stopListeningStub.args[0][0]
  assert.equal(connection.status, 'ok')
  assert.equal(service.isListening, false)
})

test('stopListening should do nothing when transporter does not have a stopListening method', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        stopListening: undefined,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = {
    status: 'noaction',
    warning:
      "Service 'entries' only allows stopping listening by closing the connection",
    origin: 'service:entries',
  }

  await service.listen(dispatch)
  const ret = await service.stopListening()

  assert.deepEqual(ret, expected)
  assert.equal(service.isListening, true)
})

test('stopListening should do nothing when no connection', async () => {
  const stopListeningStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        stopListening: stopListeningStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = {
    status: 'noaction',
    warning: "Service 'entries' does not have an open connection",
    origin: 'service:entries',
  }

  await service.close() // Close to make sure there's no connection
  const ret = await service.stopListening()

  assert.deepEqual(ret, expected)
  assert.equal(stopListeningStub.callCount, 0)
  assert.equal(service.isListening, false)
})

// Tests -- close

test('close should disconnect transporter', async () => {
  const disconnectStub = sinon.stub().resolves({ status: 'ok' })
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        disconnect: disconnectStub,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = { status: 'ok' }

  await service.listen(dispatch)
  const ret = await service.close()

  assert.deepEqual(ret, expected)
  assert.equal(disconnectStub.callCount, 1)
  const connection = disconnectStub.args[0][0]
  assert.equal(connection.status, 'ok')
  assert.equal(service.isListening, false)
})

test('close should probihit closed connection from behind used again', async () => {
  const resources = {
    ...jsonResources,
    transporters: {
      ...jsonResources.transporters,
      http: {
        ...jsonResources.transporters?.http,
        listen: async () => ({ status: 'ok' }), // To make sure the connection is connected
        disconnect: async () => undefined,
      } as Transporter,
    },
    mapTransform,
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
    resources,
  )
  const expected = {
    status: 'error',
    error: "Service 'entries' has no open connection",
    origin: 'service:entries',
  }

  await service.listen(dispatch)
  await service.close()
  const ret = await service.listen(dispatch)

  assert.deepEqual(ret, expected)
})

test('close should just return ok when no connection', async () => {
  const resources = {
    ...jsonResources,
    mapTransform,
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
    resources,
  )
  const expected = { status: 'ok' }

  await service.close() // Closing will set the connection to null
  const ret = await service.close()

  assert.deepEqual(ret, expected)
  assert.equal(service.isListening, false)
})

test.todo('should not allow unauthorized access when auth is true')
test.todo('should not allow unauthorized access when auth.outgoing is true')
