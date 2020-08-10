import test from 'ava'
import sinon = require('sinon')
import setupService from '../service'
import schema from '../schema'
import { completeExchange } from '../utils/exchangeMapping'
import { DataObject } from '../types'
import httpTransporter from 'integreat-transporter-http'

import request from './request'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    service: 'entries',
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

const mutation = [
  {
    $direction: 'fwd',
    'params.id': 'data.items[0].key',
    data: { $transform: 'value', value: undefined }, // TODO: Find a way to avoid this?
  },
  {
    $direction: 'rev',
    data: ['data', { $apply: 'entry' }],
  },
]

// Tests

test('should dispatch action based on options and map response', async (t) => {
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation,
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' },
          actionMeta: { project: 'project1' },
        },
      },
    ],
  })
  const getService = (type?: string | string[], serviceId?: string) =>
    type === 'entry' || serviceId === 'entries' ? service : undefined
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { service: 'entries', data: { items: [{ key: 'ent1' }] } },
    ident: { id: 'johnf' },
    incoming: true,
  })
  const expected = completeExchange({
    type: 'GET',
    request: {
      id: 'ent1',
      type: 'entry',
      data: undefined,
      service: 'entries',
    },
    response: {},
    ident: { id: 'johnf' },
    meta: { project: 'project1' },
  })
  const dispatch = sinon.stub().resolves({ ...expected, status: 'ok' })

  const ret = await request(exchange, dispatch, getService)

  t.deepEqual(ret.status, 'ok', ret.response.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should return exchange mapped to service', async (t) => {
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation,
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' },
          actionMeta: { project: 'project1' },
        },
      },
    ],
  })
  const getService = (type?: string | string[], _serviceId?: string) =>
    type === 'entry' ? service : undefined
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: { items: [{ key: 'ent1' }] } },
    ident: { id: 'johnf' },
    incoming: true,
  })
  const dispatch = async () =>
    completeExchange({
      type: 'GET',
      status: 'ok',
      request: {
        id: 'ent1',
        type: 'entry',
      },
      response: {
        data: [{ $type: 'entry', id: 'ent1', title: 'Entry 1' }],
      },
      ident: { id: 'johnf' },
      meta: { project: 'project1' },
    })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  const items = (ret.response.data as DataObject).items as DataObject[]
  t.is(items.length, 1)
  t.is(items[0].key, 'ent1')
  t.is(items[0].header, 'Entry 1')
})

test('should dispatch action with mapped data by type from request action', async (t) => {
  const dispatch = sinon.stub().resolves(completeExchange({ status: 'ok' }))
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { actionType: 'SET', actionPayload: { type: 'hook' } },
      },
    ],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: {
      type: 'entry',
      data: { items: [{ key: 'ent1', header: 'Entry 1' }] },
      sendNoDefaults: true,
    },
    ident: { id: 'johnf' },
    meta: { project: 'project1' },
    incoming: true,
  })
  const expected = completeExchange({
    type: 'SET',
    request: {
      type: 'hook',
      data: [
        {
          $type: 'entry',
          id: 'ent1',
          title: 'Entry 1',
        },
      ],
      sendNoDefaults: true, // TODO: Should this really be included in next exchange?
    },
    ident: { id: 'johnf' },
    meta: { project: 'project1' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should respond with mapped data', async (t) => {
  const data = [
    {
      $type: 'entry',
      id: 'ent1',
      title: 'Entry 1',
      two: 2,
    },
  ]
  const dispatch = async () =>
    completeExchange({
      status: 'ok',
      response: { data },
      ident: { id: 'johnf' },
    })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation: [
          {
            $direction: 'fwd',
            'params.id': 'data.key',
            data: { $transform: 'value', value: undefined },
          },
          {
            $direction: 'rev',
            data: ['data.content.entries', { $apply: 'entry' }],
          },
        ],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } },
        returnNoDefaults: true,
      },
    ],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
    incoming: true,
  })
  const expectedData = {
    content: {
      entries: { items: [{ key: 'ent1', header: 'Entry 1', two: 2 }] },
    },
  }

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.response.data, expectedData)
})

test('should use type from request action if not set on endpoint', async (t) => {
  const dispatch = sinon.stub().resolves(completeExchange({ status: 'ok' }))
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation,
        options: { actionType: 'GET' },
      },
    ],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: { items: [{ key: 'ent1' }] } },
    response: {},
    ident: { id: 'johnf' },
    incoming: true,
  })
  const expected = completeExchange({
    type: 'GET',
    request: {
      id: 'ent1',
      type: 'entry',
      data: undefined,
    },
    ident: { id: 'johnf' },
  })

  await request(exchange, dispatch, getService)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should respond with noaction when no action type is set on endpoint', async (t) => {
  const dispatch = async () =>
    completeExchange({
      status: 'ok',
      response: { data: [] },
      ident: { id: 'johnf' },
    })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation,
      },
    ],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('should respond with noaction when no endpoint matches', async (t) => {
  const dispatch = sinon.stub().resolves(completeExchange({ status: 'ok' }))
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { data: { items: [{ key: 'ent1' }] } },
    ident: { id: 'johnf' },
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'noaction', ret.response.error)
  t.is(
    ret.response.error,
    "No endpoint matching REQUEST request to service 'entries'."
  )
})

test('should map and pass on error from dispatch', async (t) => {
  const dispatch = async () =>
    completeExchange({
      status: 'notfound',
      response: { error: 'Not found' },
      ident: { id: 'johnf' },
    })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation: [
          { $direction: 'fwd', data: ['data', { $apply: 'entry' }] },
          {
            $direction: 'rev',
            'data.items': ['data.content', { $apply: 'entry' }],
            error: 'data.a:errorMessage',
          },
        ],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } },
      },
    ],
  })
  const getService = () => service
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: { key: 'ent1' } },
    ident: { id: 'johnf' },
    incoming: true,
  })
  const expectedResponse = {
    data: { 'a:errorMessage': 'Not found', content: { items: [] } }, // TODO: Find way to avoid empty on error?
    error: 'Not found',
    // access: { status: 'granted', scheme: 'auth' }
  }

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'notfound', ret.response.error)
  t.deepEqual(ret.response, expectedResponse)
})

test.todo('should run options through transporter.prepareOptions')

test('should get service by service id', async (t) => {
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { service: 'entries', type: 'entry', data: 'ent1' },
    ident: { id: 'johnf' },
    incoming: true,
  })
  const dispatch = async () =>
    completeExchange({
      type: 'GET',
      status: 'ok',
      request: { type: 'entry' },
      response: { data: [] },
      ident: { id: 'johnf' },
    })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    transporter: httpTransporter,
    endpoints: [
      {
        match: { action: 'REQUEST' },
        mutation,
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' },
        },
      },
    ],
  })
  const getService = (_type?: string | string[], serviceId?: string) =>
    serviceId === 'entries' ? service : undefined

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'ok', ret.response.error)
})

test('should return error on unknown service', async (t) => {
  const getService = () => undefined
  const dispatch = async () => completeExchange({ status: 'ok' })
  const exchange = completeExchange({
    type: 'REQUEST',
    request: { type: 'entry', data: '{"key":"ent1"}' },
    ident: { id: 'johnf' },
    incoming: true,
  })

  const ret = await request(exchange, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.response.error, "No service exists for type 'entry'")
  t.is(ret.request.data, '{"key":"ent1"}')
})
