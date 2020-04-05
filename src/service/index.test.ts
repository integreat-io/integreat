import test from 'ava'
import sinon = require('sinon')
import jsonAdapter from 'integreat-adapter-json'
import functions from '../transformers/builtIns'
import schema from '../schema'
import { Connection } from '../types'
import { EndpointOptions } from '../service/endpoints/types'
import { Authentication } from '../auth/types'

import setupService from '.'

// Setup

const schemas = {
  entry: schema({
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
  account: schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: {
      identFromField: 'id',
      actions: {
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

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  ident: {},
  options: {},
  meta: {},
}

const json = jsonAdapter()
const adapters = { json }

const endpoints = [
  {
    id: 'endpoint1',
    match: { type: 'entry' },
    options: { uri: 'http://test.api/1' },
  },
  {
    id: 'endpoint2',
    match: { type: 'entry', scope: 'member' },
    options: { uri: 'http://test.api/2' },
  },
  {
    id: 'endpoint3',
    match: { type: 'account' },
    options: { uri: 'http://some.api/1.0' },
  },
]

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
    setupService({ mapOptions })({ id: 'entries' })
  })
})

// Tests -- assignEndpointMapper

test('assignEndpointMapper should assign an endpoint to the exchange', (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    mappings: { entry: 'entry' },
    endpoints,
  })
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'entry',
      id: 'ent1',
    },
    ident: { id: 'johnf' },
  }

  const ret = service.assignEndpointMapper(exchange)

  t.is(ret.type, 'GET')
  t.truthy(ret.endpoint)
  t.is(ret.endpoint?.id, 'endpoint2')
})

test('assignEndpointMapper should set endpoint to undefined and status noaction on no match', (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    mappings: { entry: 'entry' },
    endpoints,
  })
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      type: 'unknown',
    },
    ident: { id: 'johnf' },
  }

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
    mappings: { entry: 'entry' },
  })
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
  }

  const ret = service.assignEndpointMapper(exchange)

  t.true(ret.endpoint.options.correct)
})

// Tests -- authorizeExchange

test('authorizeExchange should set authorized flag', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    mappings: { account: 'account' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'account' },
    ident: { root: true, id: 'root' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should authorize exchange without type', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    mappings: { account: 'account' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { params: { what: 'somethingelse' } },
    ident: { id: 'johnf' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should authorize based on schema', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    adapter: 'json',
    auth: { id: 'auth1' },
    mappings: { account: 'account' },
    endpoints,
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'account' },
    ident: { id: 'johnf' },
  })
  const expectedExchange = {
    ...exchange,
    authorized: true,
  }

  const ret = await service.authorizeExchange(exchange)

  t.deepEqual(ret, expectedExchange)
})

test('authorizeExchange should return noaccess when request is refused', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    response: { data: [] },
    ident: null,
  })
  const expectedExchange = {
    ...exchange,
    authorized: false,
    status: 'noaccess',
    response: {
      data: [],
      error: "Anonymous user don't have access to perform this action",
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
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    status: 'ok',
    response: { data },
  }

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

test('sendExchange should connect before sending request', async (t) => {
  const connect = async (
    { value }: EndpointOptions,
    { token }: Authentication,
    _connection: Connection | null
  ) => ({ status: 'ok', value, token })
  const adapters = {
    json: {
      ...json,
      connect: connect,
      send: sinon.stub().resolves({ status: 'ok', data: {} }),
    },
  }
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      { options: { uri: 'http://some.api/1.0', value: 'Value from options' } },
    ],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
    auth: { status: 'ok', token: 't0k3n' },
  })

  await service.sendExchange(exchange)

  t.is(adapters.json.send.callCount, 1)
  t.deepEqual(adapters.json.send.args[0][1], {
    status: 'ok',
    value: 'Value from options',
    token: 't0k3n',
  })
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
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
    auth: { status: 'ok', token: 't0k3n' },
  })

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
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
    auth: { status: 'ok', token: 't0k3n' },
  })

  const ret = await service.sendExchange(exchange)

  t.is(ret.status, 'error')
  t.is(ret.response.error, "Could not connect to service 'entries': Not found")
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
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
  })
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
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    ident: { id: 'johnf' },
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
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    status: 'badrequest',
    type: 'GET',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    response: { error: 'Bad request catched early' },
    ident: { id: 'johnf' },
  })
  const expected = exchange

  const ret = await service.sendExchange(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mapFromService

test.serial('mapFromService should map data array from service', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        fromMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
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

  const ret = await service.mapFromService(exchange)

  t.deepEqual(ret, expected)
})

test('mapFromService should map data object from service', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        fromMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
    mappings: { account: 'account' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
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

  const ret = await service.mapFromService(exchange)

  t.false(Array.isArray(ret.response.data))
  t.is(ret.response.data.id, 'johnf')
  t.is(ret.response.data.$type, 'account')
})

test('mapFromService should map data with overridden mapping on endpoint', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        fromMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' },
        mappings: { entry: 'entry2' },
      },
    ],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    status: 'ok',
    request: { id: 'ent1', type: 'entry', service: 'thenews' },
    response: {
      data: {
        content: {
          data: {
            items: [
              { key: 'ent1', header: 'Entry 1', subheader: 'Subheader 1' },
            ],
          },
        },
      },
    },
    ident: { id: 'johnf' },
  })

  const ret = await service.mapFromService(exchange)

  t.is(ret.response.data[0].title, 'Subheader 1')
})

test('mapFromService should use mapping defined in service definition', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints,
    mappings: {
      entry: [
        {
          $iterate: true,
          id: 'key',
        },
      ],
    },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' },
    response: { data: [{ key: 'ent1' }] },
    ident: { id: 'johnf' },
  })

  const ret = await service.mapFromService(exchange)

  t.is(ret.response.data.length, 1)
  t.is(ret.response.data[0].id, 'ent1')
})

test('mapFromService send should skip mappings referenced by unknown id', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints,
    mappings: { entry: 'unknown' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' },
    response: { data: [{ key: 'ent1' }] },
    ident: { id: 'johnf' },
  })

  const ret = await service.mapFromService(exchange)

  t.is(ret.response.data, undefined)
})

test('mapFromService should map null to undefined', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'accounts',
    endpoints: [
      {
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
    mappings: { account: 'account' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'GET',
    status: 'ok',
    request: { id: 'johnf', type: 'account' },
    response: {
      data: { accounts: null },
    },
    ident: { id: 'johnf' },
  })
  const expected = {
    ...exchange,
    response: {
      data: undefined,
    },
    ident: { id: 'johnf' },
  }

  const ret = await service.mapFromService(exchange)

  t.deepEqual(ret, expected)
})

// test.skip('mapFromService should map with default values', async t => {
//   const send = async () => ({
//     status: 'ok',
//     data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
//   })
//   const service = setupService({ mapOptions, schemas })({
//     id: 'entries',
//     endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
//     adapter: { ...json, send },
//     mappings: { entry: 'entry' }
//   })
//   const action = {
//     type: 'GET',
//     payload: { id: 'ent1', type: 'entry', onlyMappedValues: false },
//     meta: { ident: { id: 'johnf' } }
//   }
//
//   const { response } = await service.send(action)
//
//   const { data } = response
//   t.is(data[0].one, 1)
//   // TODO: Fix dates
//   // t.true(data[0].createdAt instanceof Date)
//   // t.true(data[0].updatedAt instanceof Date)
// })

// test.skip('mapFromService should not map response data when unmapped is true', async t => {
//   const send = async () => ({
//     status: 'ok',
//     data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
//   })
//   const service = setupService({ mapOptions, schemas })({
//     id: 'entries',
//     endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
//     adapter: { ...json, send },
//     mappings: { entry: 'entry' }
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

test('mapFromService should respond with error when no endpoint and no error', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    endpoints: [
      {
        fromMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    adapter: 'json',
    mappings: { entry: 'entry' },
  })
  const exchange = {
    ...exchangeDefaults,
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
  }
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      ...exchange.response,
      error: 'No endpoint provided',
    },
  }

  const ret = await service.mapFromService(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mapToService

test('mapToService should cast and map request data', async (t) => {
  const theDate = new Date()
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints: [
      {
        toMapping: 'content.data[].createOrMutate',
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
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

  const ret = await service.mapToService(exchange)

  t.deepEqual(ret, expectedExchange)
})

test.todo('should strip undefined from data array')

test('mapToService send should use toMapping pipeline', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints: [
      {
        toMapping: [
          'data',
          {
            data: [
              'StupidSoapOperator.StupidSoapEmptyArgs',
              { $alt: 'value', value: {} },
            ],
          },
        ],
        options: { uri: 'http://soap.api/1.1' },
      },
    ],
    mappings: { entry: 'entry' },
  })
  const exchange = service.assignEndpointMapper({
    ...exchangeDefaults,
    type: 'SET',
    request: {},
    ident: { id: 'johnf' },
  })
  const expectedData = {
    StupidSoapOperator: { StupidSoapEmptyArgs: {} },
  }

  const ret = await service.mapToService(exchange)

  t.deepEqual(ret.request.data, expectedData)
})

test('mapToService should respond with error when no endpoint', async (t) => {
  const service = setupService({ mapOptions, schemas, adapters })({
    id: 'entries',
    adapter: 'json',
    endpoints: [
      {
        toMapping: 'content.data[].createOrMutate',
        options: { uri: 'http://some.api/1.0' },
      },
    ],
    mappings: { entry: 'entry' },
  })
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      type: 'entry',
      data: [],
    },
    ident: { id: 'johnf' },
  }
  const expected = {
    ...exchange,
    status: 'error',
    response: {
      ...exchange.response,
      error: 'No endpoint provided',
    },
  }

  const ret = await service.mapToService(exchange)

  t.deepEqual(ret, expected)
})
