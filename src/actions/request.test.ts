import test from 'ava'
import sinon = require('sinon')
import setupService from '../service'
import schema from '../schema'
import jsonAdapter from 'integreat-adapter-json'

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
      service: 'service'
    },
    access: 'auth'
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
    author: '^access.ident.id',
    createdAt: 'created',
    updatedAt: 'updated'
  },
  { $apply: 'cast_entry' }
]

const mapOptions = {
  pipelines: {
    ['cast_entry']: schemas.entry.mapping,
    entry: entryMapping
  }
}

// Tests

test('should dispatch action from options and map response', async t => {
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
          actionMeta: { project: 'project1' }
        }
      }
    ],
    adapter: json
  })
  const getService = (type?: string | string[], _serviceId?: string) =>
    type === 'hook' ? service : undefined
  const action = {
    type: 'REQUEST',
    payload: {
      data: { items: [{ key: 'ent1' }] },
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

  const ret = await request(action, dispatch, getService)

  t.deepEqual(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

// Waiting for solution to unmappedOnly
test.failing(
  'should dispatch action with mapped data by type from request action',
  async t => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const service = setupService({ mapOptions, schemas })({
      id: 'entries',
      endpoints: [
        {
          match: { action: 'REQUEST' },
          options: { actionType: 'SET', actionPayload: { type: 'hook' } }
        }
      ],
      adapter: json,
      mappings: { entry: 'entry' }
    })
    const getService = () => service
    const action = {
      type: 'REQUEST',
      payload: {
        data: { items: [{ key: 'ent1', header: 'Entry 1' }] },
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
            $type: 'entry',
            id: 'ent1',
            title: 'Entry 1'
          }
        ]
      },
      meta: { ident: { id: 'johnf' }, project: 'project1' }
    }

    const ret = await request(action, dispatch, getService)

    t.is(ret.status, 'ok', ret.error)
    t.is(dispatch.callCount, 1)
    t.deepEqual(dispatch.args[0][0], expected)
  }
)

// Waiting for solution to unmappedOnly
test.failing('should respond with mapped data', async t => {
  const data = [
    {
      $type: 'entry',
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
        fromMapping: { 'params.id': 'data.key' },
        toMapping: ['data', { data: { items: 'content.entries' } }],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const getService = () => service
  const action = {
    type: 'REQUEST',
    payload: { data: '{"key":"ent1"}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'ok',
    data: {
      content: { entries: [{ key: 'ent1', header: 'Entry 1', two: 2 }] }
    },
    access: { ident: { id: 'johnf' } } // status: 'granted', scheme: 'data'
  }

  const ret = await request(action, dispatch, getService)

  t.deepEqual(ret, expected)
})

test('should use type from request action if not set on endpoint', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        fromMapping: { 'params.id': 'data.items[0].key' },
        options: { actionType: 'GET' }
      }
    ],
    adapter: json
  })
  const getService = () => service
  const action = {
    type: 'REQUEST',
    payload: { data: { items: [{ key: 'ent1' }] }, type: 'entry' },
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

  await request(action, dispatch, getService)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should respond with noaction when no action type is set on endpoint', async t => {
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
        fromMapping: { 'params.id': 'data.key' },
        toMapping: { 'data.items': 'content.entries' }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const getService = () => service
  const action = {
    type: 'REQUEST',
    payload: { data: '{"key":"ent1"}', type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await request(action, dispatch, getService)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should respond with noaction when no endpoint matches', async t => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    adapter: json
  })
  const getService = () => service
  const action = {
    type: 'REQUEST',
    payload: { data: { items: [{ key: 'ent1' }] } },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await request(action, dispatch, getService)

  t.is(ret.status, 'noaction', ret.error)
  t.is(ret.error, "No endpoint matching REQUEST request to service 'entries'.")
})

// Waiting for solution to unmappedOnly
test.failing('should map and pass on error from dispatch', async t => {
  const dispatch = async () => ({
    status: 'notfound',
    error: 'Not found',
    access: { status: 'granted', ident: { id: 'johnf' } }
  })
  const getService = () => service
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        toMapping: [
          'data',
          {
            'data.items': 'content',
            error: 'a:errorMessage'
          }
        ],
        options: { actionType: 'GET', actionPayload: { type: 'entry' } }
      }
    ],
    adapter: json,
    mappings: { entry: 'entry' }
  })
  const action = {
    type: 'REQUEST',
    payload: { data: { key: 'ent1' }, type: 'entry' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'notfound',
    data: { 'a:errorMessage': 'Not found' },
    error: 'Not found',
    access: { ident: { id: 'johnf' } } // status: 'granted', scheme: 'auth'
  }

  const ret = await request(action, dispatch, getService)

  t.deepEqual(ret, expected)
})

test.todo('should run options through adapter.prepareOptions')

test('should get service by service id', async t => {
  const dispatch = async () => ({ status: 'ok', data: [] })
  const service = setupService({ mapOptions, schemas })({
    id: 'entries',
    endpoints: [
      {
        match: { action: 'REQUEST' },
        options: {
          actionType: 'GET',
          actionPayload: { type: 'entry' }
        }
      }
    ],
    adapter: json
  })
  const getService = (_type?: string | string[], serviceId?: string) =>
    serviceId === 'entries' ? service : undefined
  const action = {
    type: 'REQUEST',
    payload: { service: 'entries', data: 'ent1', type: 'hook' },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await request(action, dispatch, getService)

  t.deepEqual(ret.status, 'ok', ret.error)
})

test('should return error on unknown service', async t => {
  const getService = () => null
  const dispatch = async () => ({ status: 'ok' })
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', data: '{"key":"ent1"}' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'error',
    error: "No service exists for type 'entry'"
  }

  const ret = await request(action, dispatch, getService)

  t.deepEqual(ret, expected)
})
