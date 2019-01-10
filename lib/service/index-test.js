import test from 'ava'
import sinon from 'sinon'
import json from 'integreat-adapter-json'
import schema from '../schema'
import createMapping from '../mapping'

import setupService from '.'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    plural: 'entries',
    attributes: {
      title: 'string',
      one: { type: 'integer', default: 1 },
      two: 'integer'
    },
    relationships: {
      service: 'service'
    },
    access: 'auth'
  }),
  account: schema({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      methods: {
        TEST: 'all'
      }
    }
  })
}

const mappings = [
  {
    id: 'entry',
    path: 'items[]',
    attributes: {
      id: 'key',
      title: 'header',
      one: 'one',
      two: 'two'
    },
    relationships: {
      service: '$params.service'
    }
  },
  {
    id: 'entry2',
    path: 'items[]',
    attributes: {
      id: 'key',
      title: 'subheader'
    },
    relationships: {}
  },
  {
    id: 'account',
    path: 'accounts',
    attributes: { id: 'id', name: 'name' }
  }
]

const setupMapping = createMapping({ schemas, mappings })

const endpoints = [
  { match: {}, options: { uri: ['http://some.api/1.0'] } }
]

// Tests

test('should return service object with id, adapter, endpoints, and meta', (t) => {
  const endpoints = [{ id: 'endpoint1', options: { uri: 'http://some.api/1.0' } }]
  const def = { id: 'entries', adapter: 'json', endpoints, meta: 'meta' }
  const adapters = { json }

  const service = setupService({ adapters, setupMapping, schemas })(def)

  t.is(service.id, 'entries')
  t.is(service.adapter, json)
  t.is(service.endpoints.length, 1)
  t.is(service.endpoints[0].id, 'endpoint1')
  t.is(service.meta, 'meta')
})

test('should throw when no id', (t) => {
  const adapters = { json }

  t.throws(() => {
    setupService({ adapters, setupMapping, schemas })({ adapter: 'json' })
  })
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    setupService()({ id: 'entries' })
  })
})

// Tests -- send

test('send should retrieve and map data from endpoint', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: { content: { data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] } } }
  })
  const service = setupService({ setupMapping, schemas })({
    id: 'entries',
    endpoints: [{
      responseMapping: 'content.data',
      options: { uri: 'http://some.api/1.0' }
    }],
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
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: { title: 'Entry 1', two: 2 },
      relationships: {
        service: { id: 'thenews', type: 'service' }
      }
    }],
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const { response } = await service.send(action)

  t.deepEqual(response, expected)
})

test('send should retrieve and map data with mapping from endpoint', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: { content: { data: { items: [{ key: 'ent1', header: 'Entry 1', subheader: 'Subheader 1' }] } } }
  })
  const service = setupService({ setupMapping, schemas })({
    id: 'entries',
    endpoints: [{
      responseMapping: 'content.data',
      options: { uri: 'http://some.api/1.0' },
      mappings: { entry: 'entry2' }
    }],
    adapter: { ...json, send },
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', service: 'thenews' },
    meta: { ident: { id: 'johnf' } }
  }

  const { response } = await service.send(action)

  t.is(response.data[0].attributes.title, 'Subheader 1')
})

test('send should return error response when no endpoint', async (t) => {
  const send = async () => ({ status: 'ok', data: [] })
  const service = setupService({ setupMapping, schemas })({
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
  t.is(response.status, 'error')
  t.is(response.error, 'No endpoint specified on request to service \'entries\'.')
})

test('should return noaccess when request is refused', async (t) => {
  const send = async () => ({ status: 'ok', data: [] })
  const service = setupService({ setupMapping, schemas })({
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

test('send should retrieve from endpoint with default values', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
  })
  const service = setupService({ setupMapping, schemas })({
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
  t.is(data[0].attributes.one, 1)
  t.true(data[0].attributes.createdAt instanceof Date)
  t.true(data[0].attributes.updatedAt instanceof Date)
})

test('send should return authorized response', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: {
      accounts: [
        { id: 'johnf', type: 'account' },
        { id: 'betty', type: 'account' }
      ]
    }
  })
  const service = setupService({ setupMapping, schemas })({
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
    data: [
      { id: 'johnf', type: 'account', attributes: {}, relationships: {} }
    ],
    access: {
      status: 'partially',
      scheme: 'data',
      ident: { id: 'johnf' }
    }
  }

  const ret = await service.send(action)

  t.deepEqual(ret.response, expected)
})

test('send should cast, map and send data to service', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: '[]' })
  const service = setupService({ setupMapping, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints: [{
      requestMapping: 'content.data[].createOrMutate',
      options: { uri: 'http://some.api/1.0' }
    }],
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [
        { id: 'ent1', type: 'entry', attributes: { title: 'The heading', two: '2' } }
      ]
    },
    meta: { ident: { id: 'johnf' } }
  }
  const expectedData = JSON.stringify({
    content: {
      data: [
        { createOrMutate: { items: [{ key: 'ent1', header: 'The heading', two: 2 }] } }
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

test('send should use empty as default', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: '[]' })
  const service = setupService({ setupMapping, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints: [{
      requestMapping: {
        'StupidSoapOperator.StupidSoapEmptyArgs': { path: 'data', default: {} }
      },
      options: { uri: 'http://soap.api/1.1' }
    }],
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'GET',
    payload: {},
    meta: { ident: { id: 'johnf' } }
  }
  const expectedData = JSON.stringify({ StupidSoapOperator: { StupidSoapEmptyArgs: {} } })

  const { response } = await service.send(action)

  t.is(response.status, 'ok')
  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.truthy(sentRequest)
  t.deepEqual(sentRequest.data, expectedData)
})

test('send should use mapping defined on service', async (t) => {
  const send = async () => ({ status: 'ok', data: [{ key: 'ent1' }] })
  const service = setupService({ setupMapping, schemas })({
    id: 'entries',
    adapter: { ...json, send },
    endpoints,
    mappings: {
      entry: {
        attributes: { id: 'key' }
      }
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

test('send should skip mappings referenced by unknown id', async (t) => {
  const send = async () => ({ status: 'ok', data: [{ key: 'ent1' }] })
  const service = setupService({ setupMapping, schemas })({
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

test('send should not map response data when unmapped is true', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
  })
  const service = setupService({ setupMapping, schemas })({
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
