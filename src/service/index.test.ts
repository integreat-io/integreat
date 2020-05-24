import test from 'ava'
import sinon = require('sinon')
import jsonAdapter from 'integreat-adapter-json'
import functions from '../transformers/builtIns'
import createSchema from '../schema'
import { Connection, Authentication } from './types'
import { TypedData } from '../types'
import { EndpointOptions } from '../service/endpoints/types'
import { completeExchange } from '../utils/exchangeMapping'
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
      service: 'service',
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
    service: '^params.service',
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

const json = jsonAdapter()
const adapters = { json }

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

// Tests

test('should return service object with id and meta', (t) => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } },
  ]
  const def = { id: 'entries', adapter: 'json', endpoints, meta: 'meta' }

  const service = setupService({
    adapters,
    mapOptions,
    schemas,
  })(def)

  t.is(service.id, 'entries')
  t.is(service.meta, 'meta')
})

test('should throw when no id', (t) => {
  t.throws(() => {
    setupService({
      adapters,
      mapOptions,
      schemas,
    })({ adapter: 'json' })
  })
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    setupService({ mapOptions, schemas })({
      id: 'entries',
      adapter: 'unknown',
      endpoints: [],
    })
  })
})

// Tests -- assignEndpointMapper

test('assignEndpointMapper should assign an endpoint to the exchange', (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
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

  const ret = service.assignEndpointMapper(exchange)

  t.is(ret.type, 'GET')
  t.truthy(ret.endpoint)
  t.is(ret.endpoint?.id, 'endpoint2')
})

test('assignEndpointMapper should set endpoint to undefined and status noaction on no match', (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints,
  })
  const exchange = completeExchange({
    type: 'GET',
    request: {
      type: 'unknown',
    },
    ident: { id: 'johnf' },
  })

  const ret = service.assignEndpointMapper(exchange)

  t.is(ret.endpoint, undefined)
  t.is(ret.status, 'noaction')
  t.is(
    ret.response.error,
    "No endpoint matching GET request to service 'entries'."
  )
})

test('assignEndpointMapper should pick the most specified endpoint', async (t) => {
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
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints,
    adapter: 'json',
  })
  const exchange = completeExchange({
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
  })

  const ret = service.assignEndpointMapper(exchange)

  t.true(ret.endpoint.options.correct)
})

// Tests -- authorizeExchange

test('authorizeExchange should set authorized flag', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { type: 'account' },
      ident: { root: true, id: 'root' },
    })
  )
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should authorize exchange request without type', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'SET',
      request: { params: { what: 'somethingelse' } },
      ident: { id: 'johnf' },
    })
  )
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should refuse based on schema', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { type: 'account' },
      ident: { id: 'johnf', roles: ['user'] },
      auth: { status: 'granted' },
    })
  )
  const expectedExchange = {
    ...exchange,
    authorized: false,
    status: 'noaccess',
    response: {
      error: "Authentication was refused, role required: 'admin'",
      reason: 'MISSING_ROLE',
    },
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

// Tests -- sendExchange

test('sendExchange should retrieve data from service', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const adapters = {
    json: {
      ...json,
      send: async () => ({ status: 'ok', data }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters, auths })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'granting',
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
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

test('sendExchange should authenticate and return with error', async (t) => {
  const data = {
    content: {
      data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }
  const adapters = {
    json: {
      ...json,
      send: async () => ({ status: 'ok', data }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters, auths })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'refusing',
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
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
  const service = setupService({ mapOptions, schemas, adapters, auths })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    auth: 'granting',
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: false,
    })
  )
  const expected = {
    ...exchange,
    status: 'error',
    response: { error: 'Not authorized' },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should connect before sending request', async (t) => {
  const connect = async (
    { value }: EndpointOptions,
    { Authorization }: Authentication,
    _connection: Connection | null
  ) => ({ status: 'ok', value, token: Authorization })
  const send = sinon.stub().resolves({ status: 'ok', data: {} })
  const adapters = { json: { ...json, connect, send } }
  const service = setupService({
    mapOptions,
    schemas,
    adapters,
    auths,
  })({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from endpoint' } },
    ],
    options: { value: 'Value from service' },
    adapter: 'json',
    auth: 'granting',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
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
  const adapters = {
    json: {
      ...json,
      connect: sinon.stub().returns({ status: 'ok' }),
      send: async () => ({ status: 'ok', data: {} }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from options' } },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
      authorized: true,
    })
  )

  await service.sendExchange(exchange)
  await service.sendExchange(exchange)

  t.is(adapters.json.connect.callCount, 2)
  t.deepEqual(adapters.json.connect.args[0][2], null)
  t.deepEqual(adapters.json.connect.args[1][2], { status: 'ok' })
})

test('sendExchange should return error when connection fails', async (t) => {
  const adapters = {
    json: {
      ...json,
      connect: async () => ({ status: 'notfound', error: 'Not found' }),
      send: async () => ({ status: 'ok', data: {} }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from options' } },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      auth: { status: 'granted', token: 't0k3n' },
      authorized: true,
    })
  )

  const ret = await service.sendExchange(exchange)

  t.is(ret.status, 'error')
  t.is(
    ret.response.error,
    "Could not connect to service 'entries'. [notfound] Not found"
  )
})

test('sendExchange should retrieve error response from service', async (t) => {
  const adapters = {
    json: {
      ...json,
      send: async () => ({
        status: 'badrequest',
        error: 'Real bad request',
      }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
  const expected = {
    ...exchange,
    status: 'badrequest',
    response: { error: 'Real bad request', data: null },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should return with error when adapter throws', async (t) => {
  const adapters = {
    json: {
      ...json,
      send: async () => {
        throw new Error('We did not expect this')
      },
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
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
  const adapters = {
    json: {
      ...json,
      send: sinon.stub().resolves({
        status: 'error',
        error: 'Should not be called',
      }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      status: 'badrequest',
      type: 'GET',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
      response: { error: 'Bad request catched early' },
      ident: { id: 'johnf' },
      authorized: true,
    })
  )
  const expected = exchange

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mapResponse

test.serial('mapResponse should map data array from service', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data.content.data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      status: 'ok',
      request: { id: 'ent1', type: 'entry', service: 'thenews' },
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
  )
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
          service: { id: 'thenews', $ref: 'service' },
          createdAt: theDate,
          updatedAt: theDate,
        },
      ],
    },
    ident: { id: 'johnf' },
  }

  const ret = await service.mapResponse(exchange)

  t.deepEqual(ret, expected)
})

test('mapResponse should map data object from service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data.content.data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )

  const ret = await service.mapResponse(exchange)

  t.false(Array.isArray(ret.response.data))
  t.is(ret.response.data.id, 'johnf')
  t.is(ret.response.data.$type, 'account')
})

test('mapResponse should map null to undefined', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'GET',
      status: 'ok',
      request: { id: 'johnf', type: 'account' },
      response: {
        data: { accounts: null },
      },
      ident: { id: 'johnf' },
    })
  )
  const expected = {
    ...exchange,
    response: {
      data: undefined,
    },
    ident: { id: 'johnf' },
  }

  const ret = await service.mapResponse(exchange)

  t.deepEqual(ret, expected)
})

test('should authorize typed data in array from service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )

  const ret = await service.mapResponse(exchange)

  t.is(ret.status, 'ok')
  t.is(ret.response.data.length, 1)
  t.is(ret.response.data[0].id, 'johnf')
  t.is(
    ret.response.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('should authorize typed data object from service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )

  const ret = await service.mapResponse(exchange)

  t.is(ret.status, 'noaccess')
  t.is(ret.response.data, undefined)
  t.is(ret.response.error, "Authentication was refused for type 'account'")
})

test('should authorize typed data in array to service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'account' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
      incoming: true,
    })
  )

  const ret = await service.mapResponse(exchange)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(ret.response.data.accounts.length, 1)
  t.is(ret.response.data.accounts[0].id, 'johnf')
  t.is(
    ret.response.warning,
    '1 item was removed from response data due to lack of access'
  )
})

test('mapResponse should map without default values', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )

  const ret = await service.mapResponse(exchange)

  const data = ret.response.data as TypedData[]
  t.is(data[0].one, undefined)
  t.is(data[0].createdAt, undefined)
  t.is(data[0].updatedAt, undefined)
})

// test.skip('mapResponse should not map response data when unmapped is true', async t => {
//   const send = async () => ({
//     status: 'ok',
//     data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
//   })
//   const service = setupService({ mapOptions, schemas })({
//     id: 'entries',
//     endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
//     adapter: { ...json, send },
//   })
//   const action = {
//     type: 'GET',
//     payload: { id: 'ent1', type: 'entry', service: 'thenews', unmapped: true },
//     meta: { ident: { root: true } }
//   }
//   const expected = {
//     status: 'ok',
//     data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
//     access: { status: 'granted', ident: { root: true }, scheme: 'unmapped' }
//   }
//
//   const { response } = await service.send(action)
//
//   t.deepEqual(response, expected)
// })

test('mapResponse should respond with error when no endpoint and no error', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        mutation: { data: ['data.content.data', { $apply: 'entry' }] },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
  })
  const exchange = completeExchange({
    type: 'GET',
    status: null,
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    response: {
      data: {
        content: {
          data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
        },
      },
    },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      ...exchange.response,
      error: 'No endpoint provided',
    },
  }

  const ret = await service.mapResponse(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mapRequest

test('mapRequest should cast and map request data', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints: [
      {
        mutation: {
          data: ['data.content.data[].createOrMutate', { $apply: 'entry' }],
        },
        options: { uri: 'http://some.api/1.0' },
      },
    ],
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )
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
  }

  const ret = await service.mapRequest(exchange)

  t.deepEqual(ret, expectedExchange)
})

test.todo('should strip undefined from data array')

test('mapRequest should authorize data array going to service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )
  const expectedResponse = {
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mapRequest(exchange)

  t.is(ret.request.data.accounts.length, 1)
  t.is(ret.request.data.accounts[0].id, 'johnf')
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should authorize data object going to service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
  )
  const expectedResponse = {
    error: "Authentication was refused for type 'account'",
    reason: 'WRONG_IDENT',
  }

  const ret = await service.mapRequest(exchange)

  t.is(ret.request.data.accounts, undefined)
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should authorize data array coming from service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper(
    completeExchange({
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
      incoming: true,
    })
  )
  const expectedResponse = {
    warning: '1 item was removed from request data due to lack of access',
  }

  const ret = await service.mapRequest(exchange)

  t.is(ret.status, null, ret.response.error)
  t.is(ret.request.data.length, 1)
  t.is(ret.request.data[0].id, 'johnf')
  t.is(ret.request.data[0].$type, 'account')
  t.deepEqual(ret.response, expectedResponse)
})

test('mapRequest should use mutation pipeline', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
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
  const exchange = service.assignEndpointMapper(
    completeExchange({
      type: 'SET',
      request: {},
      ident: { id: 'johnf' },
    })
  )
  const expectedData = {
    StupidSoapOperator: { StupidSoapEmptyArgs: {} },
  }

  const ret = await service.mapRequest(exchange)

  t.deepEqual(ret.request.data, expectedData)
})

test('mapRequest should respond with error when no endpoint', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints: [
      {
        mutation: ['data.content.data[].createOrMutate', { $apply: 'entry' }],
        options: { uri: 'http://some.api/1.0' },
      },
    ],
  })
  const exchange = completeExchange({
    type: 'SET',
    request: {
      type: 'entry',
      data: [],
    },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      ...exchange.response,
      error: 'No endpoint provided',
    },
  }

  const ret = await service.mapRequest(exchange)

  t.deepEqual(ret, expected)
})
