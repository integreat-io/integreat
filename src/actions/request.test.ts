import test from 'ava'
import sinon = require('sinon')
import setupService from '../service'
import schema from '../schema'
import jsonAdapter from 'integreat-adapter-json'
import { completeExchange } from '../utils/exchangeMapping'

import request from './request'

// Setup

const json = jsonAdapter()

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

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    entry: entryMapping,
  },
}

// Tests

test.failing(
  'should dispatch action from options and map response',
  async (t) => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const service = setupService({ mapOptions, schemas })({
      id: 'entries',
      endpoints: [
        {
          match: { action: 'REQUEST' },
          fromMapping: { 'params.id': 'data.items[0].key' },
          options: {
            actionType: 'GET',
            actionPayload: { type: 'entry' },
            actionMeta: { project: 'project1' },
          },
        },
      ],
      adapter: json,
    })
    const getService = (type?: string | string[], _serviceId?: string) =>
      type === 'hook' ? service : undefined
    const exchange = completeExchange({
      type: 'REQUEST',
      request: { type: 'hook' },
      response: {
        data: { items: [{ key: 'ent1' }] },
      },
      ident: { id: 'johnf' },
    })
    const expected = {
      type: 'GET',
      payload: {
        id: 'ent1',
        type: 'entry',
      },
      meta: { ident: { id: 'johnf' }, project: 'project1' },
    }

    const ret = await request(exchange, dispatch, getService)

    t.deepEqual(ret.status, 'ok', ret.response.error)
    t.is(dispatch.callCount, 1)
    t.deepEqual(dispatch.args[0][0], expected)
  }
)

// Waiting for solution to unmappedOnly
test.failing(
  'should dispatch action with mapped data by type from request action',
  async (t) => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const service = setupService({ mapOptions, schemas })({
      id: 'entries',
      endpoints: [
        {
          match: { action: 'REQUEST' },
          options: { actionType: 'SET', actionPayload: { type: 'hook' } },
        },
      ],
      adapter: json,
      mappings: { entry: 'entry' },
    })
    const getService = () => service
    const exchange = completeExchange({
      type: 'REQUEST',
      request: {
        type: 'entry',
      },
      response: { data: { items: [{ key: 'ent1', header: 'Entry 1' }] } },
      ident: { id: 'johnf' },
      meta: { project: 'project1' },
    })
    const expected = {
      type: 'SET',
      payload: {
        type: 'hook',
        data: [
          {
            $type: 'entry',
            id: 'ent1',
            title: 'Entry 1',
          },
        ],
      },
      meta: { ident: { id: 'johnf' }, project: 'project1' },
    }

    const ret = await request(exchange, dispatch, getService)

    t.is(ret.status, 'ok', ret.response.error)
    t.is(dispatch.callCount, 1)
    t.deepEqual(dispatch.args[0][0], expected)
  }
)

// Waiting for solution to unmappedOnly
test.failing('should respond with mapped data', async (t) => {
  const data = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
      two: 2,
    },
  ]
  const dispatch = async () => ({
    status: 'ok',
    data,
    access: { status: 'granted', ident: { id: 'johnf' } },
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        fromMapping: { 'params.id': 'data.key' },
        toMapping: ['data', { data: { items: 'content.entries' } }],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } },
      },
    ],
    adapter: json,
    mappings: { entry: 'entry' },
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry' },
    response: { data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
  })
  const expectedResponse = {
    data: {
      content: { entries: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok')
  t.deepEqual(ret, expectedResponse)
})

test('should use type from request action if not set on endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        fromMapping: { 'params.id': 'data.items[0].key' },
        options: { actionType: 'GET' },
      },
    ],
    adapter: json,
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry' },
    response: { data: { items: [{ key: 'ent1' }] } },
    ident: { id: 'johnf' },
  })
  const expected = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
    },
    meta: { ident: { id: 'johnf' } },
  }

  await request(exchange, dispatch, getService)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should respond with noaction when no action type is set on endpoint', async (t) => {
  const dispatch = async () => ({
    status: 'ok',
    data: [],
    access: { status: 'granted', ident: { id: 'johnf' } },
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        fromMapping: { 'params.id': 'data.key' },
        toMapping: { 'data.items': 'content.entries' },
      },
    ],
    adapter: json,
    mappings: { entry: 'entry' },
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry' },
    response: { data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('should respond with noaction when no endpoint matches', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: json,
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    response: { data: { items: [{ key: 'ent1' }] } },
    ident: { id: 'johnf' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'noaction', ret.response.error)
  t.is(
    ret.response.error,
    "No endpoint matching REQUEST request to service 'entries'."
  )
})

// Waiting for solution to unmappedOnly
test.failing('should map and pass on error from dispatch', async (t) => {
  const dispatch = async () => ({
    status: 'notfound',
    error: 'Not found',
    access: { status: 'granted', ident: { id: 'johnf' } },
  })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        toMapping: [
          'data',
          {
            'data.items': 'content',
            error: 'a:errorMessage',
          },
        ],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } },
      },
    ],
    adapter: json,
    mappings: { entry: 'entry' },
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry' },
    response: { data: { key: 'ent1' } },
    ident: { id: 'johnf' },
  })
  const expectedResponse = {
    data: { 'a:errorMessage': 'Not found' },
    error: 'Not found',
    // access: { status: 'granted', scheme: 'auth' }
  }

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'notfound')
  t.deepEqual(ret.response, expectedResponse)
})

test.todo('should run options through adapter.prepareOptions')

test.failing('should get service by service id', async (t) => {
  const dispatch = async () => ({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' },
        },
      },
    ],
    adapter: json,
  })
  const getService = (_type?: string | string[], serviceId?: string) =>
    serviceId === 'entries' ? service : undefined
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { service: 'entries', type: 'hook' },
    response: { data: 'ent1' },
    ident: { id: 'johnf' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should return error on unknown service', async (t) => {
  const getService = () => undefined
  const dispatch = async () => ({ status: 'ok' })
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry' },
    response: { data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
  })
  const expectedResponse = {
    error: "No service exists for type 'entry'",
    data: '{"key":"ent1"}',
  }

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.deepEqual(ret.response, expectedResponse)
})
