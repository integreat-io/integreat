import test from 'ava'
import sinon = require('sinon')
import json from 'integreat-adapter-json'
import functions from '../transformers/builtIns'
import schema from '../schema'

import setupService from '.'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    plural: 'entries',
    fields: {
      title: 'string',
      one: { $cast: 'integer', $default: 1 },
      two: 'integer',
      service: 'service'
    },
    access: 'auth'
  }),
  account: schema({
    id: 'account',
    fields: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      actions: {
        TEST: 'all'
      }
    }
  })
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
    author: '^access.ident.id'
  },
  { $apply: 'cast_entry' }
]

const entry2Mapping = [
  'items[]',
  {
    $iterate: true,
    id: 'key',
    title: 'subheader'
  },
  { $apply: 'cast_entry' }
]

const accountMapping = [
  'accounts',
  {
    $iterate: true,
    id: 'id',
    name: 'name'
  },
  { $apply: 'cast_account' }
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
    entry: entryMapping,
    entry2: entry2Mapping,
    account: accountMapping
  },
  functions
}

const endpoints = [{ match: {}, options: { uri: ['http://some.api/1.0'] } }]

// Tests

test('should return service object with id, adapter, endpoints, and meta', t => {
  const endpoints = [
    { id: 'endpoint1', options: { uri: 'http://some.api/1.0' } }
  ]
  const def = { id: 'entries', adapter: 'json', endpoints, meta: 'meta' }
  const adapters = { json }

  const service = setupService({
    adapters,
    mapOptions,
    schemas
  })(def)

  t.is(service.id, 'entries')
  t.is(service.adapter, json)
  t.is(service.endpoints.length, 1)
  t.is(service.endpoints[0].id, 'endpoint1')
  t.is(service.meta, 'meta')
})

test('should throw when no id', t => {
  const adapters = { json }

  t.throws(() => {
    setupService({
      adapters,
      mapOptions,
      schemas
    })({ adapter: 'json' })
  })
})

test('should throw when no adapter', t => {
  t.throws(() => {
    setupService()({ id: 'entries' })
  })
})

// Tests -- send

test('send should retrieve and map data from endpoint', async t => {
  const send = async () => ({
    status: 'ok',
    data: {
      content: { data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] } }
    }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        responseMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' }
      }
    ],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'ok',
    data: [
      {
        $schema: 'entry',
        id: 'ent1',
        title: 'Entry 1',
        two: 2,
        service: { id: 'thenews', $ref: 'service' }
      }
    ],
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const { response } = await service.send(action)

  t.deepEqual(response, expected)
})

test('send should retrieve and map data with overridden mapping on endpoint', async t => {
  const send = async () => ({
    status: 'ok',
    data: {
      content: {
        data: {
          items: [{ key: 'ent1', header: 'Entry 1', subheader: 'Subheader 1' }]
        }
      }
    }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        responseMapping: 'content.data',
        options: { uri: 'http://some.api/1.0' },
        mappings: { entry: 'entry2' }
      }
    ],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews' },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  t.is(response.data[0].title, 'Subheader 1')
})

test('send should return noaction response when no endpoint', async t => {
  const send = async () => ({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews' },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  t.truthy(response)
  t.is(response.status, 'noaction')
  t.is(response.error, "No endpoint matching request to service 'entries'.")
})

test('should return noaccess when request is refused', async t => {
  const send = async () => ({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews' },
    meta: { ident: null }
  }

  const { response } = await service.send(action)

  t.truthy(response)
  t.is(response.status, 'noaccess', response.error)
  t.is(typeof response.error, 'string')
})

test('send should retrieve from endpoint with default values', async t => {
  const send = async () => ({
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', onlyMappedValues: false },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  const { data } = response
  t.is(data[0].one, 1)
  // TODO: Fix dates
  // t.true(data[0].createdAt instanceof Date)
  // t.true(data[0].updatedAt instanceof Date)
})

test('send should return authorized response', async t => {
  const send = async () => ({
    status: 'ok',
    data: {
      accounts: [
        { id: 'johnf', type: 'account' },
        { id: 'betty', type: 'account' }
      ]
    }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'accounts',
    adapter: { ...json, send },
    auth: { id: 'auth1' },
    mappings: { account: 'account' },
    endpoints
  })
  const action = {
    type: 'GET',
    payload: { type: 'account' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'ok',
    data: [{ $schema: 'account', id: 'johnf' }],
    access: {
      status: 'partially',
      scheme: 'data',
      ident: { id: 'johnf' }
    }
  }

  const ret = await service.send(action)

  t.deepEqual(ret.response, expected)
})

test('send should cast, map and send data to service', async t => {
  const send = sinon.stub().resolves({ status: 'ok', data: '[]' })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints: [
      {
        requestMapping: 'content.data[].createOrMutate',
        options: { uri: 'http://some.api/1.0' }
      }
    ],
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [
        {
          $schema: 'entry',
          id: 'ent1',
          title: 'The heading',
          two: '2'
        },
        undefined
      ]
    },
    meta: { ident: { id: 'johnf' } }
  }
  const expectedData = JSON.stringify({
    content: {
      data: [
        {
          createOrMutate: {
            items: [{ key: 'ent1', header: 'The heading', two: 2 }]
          }
        }
      ]
    }
  })

  const { response } = await service.send(action)

  t.is(response.status, 'ok')
  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.truthy(sentRequest)
  t.deepEqual(sentRequest.data, expectedData)
})

test('send should use empty as default', async t => {
  const send = sinon.stub().resolves({ status: 'ok', data: '[]' })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints: [
      {
        requestMapping: [
          'data',
          {
            data: [
              'StupidSoapOperator.StupidSoapEmptyArgs',
              { $alt: 'value', value: {} }
            ]
          }
        ],
        options: { uri: 'http://soap.api/1.1' }
      }
    ],
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } }
  }
  const expectedData = JSON.stringify({
    StupidSoapOperator: { StupidSoapEmptyArgs: {} }
  })

  const { response } = await service.send(action)

  t.is(response.status, 'ok')
  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.truthy(sentRequest)
  t.deepEqual(sentRequest.data, expectedData)
})

test('send should use mapping defined on service', async t => {
  const send = async () => ({ status: 'ok', data: [{ key: 'ent1' }] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints,
    mappings: {
      entry: [
        {
          $iterate: true,
          id: 'key'
        }
      ]
    }
  })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  t.is(response.data.length, 1)
  t.is(response.data[0].id, 'ent1')
})

test.failing('send should skip mappings referenced by unknown id', async t => {
  const send = async () => ({ status: 'ok', data: [{ key: 'ent1' }] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints,
    mappings: { entry: 'unknown' }
  })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  t.deepEqual(response.data, [])
})

test('send should not map response data when unmapped is true', async t => {
  const send = async () => ({
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [{ options: { uri: 'http://some.api/1.0' } }],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews', unmapped: true },
    meta: { ident: { root: true } }
  }
  const expected = {
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    access: { status: 'granted', ident: { root: true }, scheme: 'unmapped' }
  }

  const { response } = await service.send(action)

  t.deepEqual(response, expected)
})

// Tests -- receive

test('receive should dispatch action with data mapped to params', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        responseMapping: { 'params.id': 'data.items[0].key' },
        incoming: true,
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' },
          actionMeta: { project: 'project1' }
        }
      }
    ],
    adapter: json
  })
  const action = {
    type: 'REQUEST',
    payload: {
      data: '{"items":[{"key":"ent1"}]}',
      type: 'hook'
    },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry'
    },
    meta: { ident: { id: 'johnf' }, project: 'project1' }
  }

  await service.receive(action, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('receive should dispatch action with mapped data by type from request action', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        incoming: true,
        options: { actionType: 'SET', actionPayload: { type: 'hook' } }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'REQUEST',
    payload: {
      data: '{"items":[{"key":"ent1","header":"Entry 1"}]}',
      type: 'entry'
    },
    meta: { ident: { id: 'johnf' }, project: 'project1' }
  }
  const expected = {
    type: 'SET',
    payload: {
      type: 'hook',
      data: [
        {
          $schema: 'entry',
          id: 'ent1',
          title: 'Entry 1'
        }
      ]
    },
    meta: { ident: { id: 'johnf' }, project: 'project1' }
  }

  const ret = await service.receive(action, dispatch)

  t.is(ret.response.status, 'ok', ret.response.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('receive should respond with serialized data', async t => {
  const data = [
    {
      $schema: 'entry',
      id: 'ent1',
      title: 'Entry 1',
      two: 2
    }
  ]
  const dispatch = async () => ({
    status: 'ok',
    data,
    access: { status: 'granted', ident: { id: 'johnf' } }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        responseMapping: { 'params.id': 'data.key' },
        requestMapping: ['data', { data: { items: 'content.entries' } }],
        incoming: true,
        options: { actionType: 'GET', actionPayload: { type: 'entry' } }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'REQUEST',
    payload: { data: '{"key":"ent1"}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'ok',
    data: '{"content":{"entries":[{"key":"ent1","header":"Entry 1","two":2}]}}',
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const ret = await service.receive(action, dispatch)

  t.deepEqual(ret.response, expected)
})

test('receive should use type from request action if not set on endpoint', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        responseMapping: { 'params.id': 'data.items[0].key' },
        incoming: true,
        options: { actionType: 'GET' }
      }
    ],
    adapter: json
  })
  const action = {
    type: 'REQUEST',
    payload: { data: '{"items":[{"key":"ent1"}]}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry'
    },
    meta: { ident: { id: 'johnf' } }
  }

  await service.receive(action, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('receive should respond with noaction when no action type is set on endpoint', async t => {
  const dispatch = async () => ({
    status: 'ok',
    data: [],
    access: { status: 'granted', ident: { id: 'johnf' } }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        responseMapping: { 'params.id': 'data.key' },
        requestMapping: { 'data.items': 'content.entries' },
        incoming: true
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'REQUEST',
    payload: { data: '{"key":"ent1"}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await service.receive(action, dispatch)

  t.is(ret.response.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('receive should respond with noaction when no endpoint matches', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: json
  })
  const action = {
    type: 'REQUEST',
    payload: { data: '{"items":[{"key":"ent1"}]}' },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await service.receive(action, dispatch)

  t.is(ret.response.status, 'noaction')
  t.is(ret.response.error, "No endpoint matching request to service 'entries'.")
})

test('receive should map and pass on error from dispatch', async t => {
  const dispatch = async () => ({
    status: 'notfound',
    error: 'Not found',
    access: { status: 'granted', ident: { id: 'johnf' } }
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        requestMapping: [
          'data',
          {
            'data.items': 'content',
            'params.error': 'a:errorMessage'
          }
        ],
        incoming: true,
        options: { actionType: 'GET', actionPayload: { type: 'entry' } }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'REQUEST',
    payload: { data: '{"key":"ent1"}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'notfound',
    data: '{"a:errorMessage":"Not found"}',
    error: 'Not found',
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'auth' }
  }

  const ret = await service.receive(action, dispatch)

  t.deepEqual(ret.response, expected)
})
