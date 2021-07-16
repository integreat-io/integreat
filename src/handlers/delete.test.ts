import test from 'ava'
import nock = require('nock')
import {
  jsonServiceDef,
  jsonPipelines,
  jsonFunctions,
} from '../tests/helpers/json'
import createService from '../service'
import createSchema from '../schema'
import functions from '../transformers/builtIns'
import { Action } from '../types'

import deleteFn from './delete'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    shape: {
      title: { $cast: 'string', $default: 'A title' },
    },
  }),
  account: createSchema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
}

const mapOptions = {
  pipelines: {
    ...jsonPipelines,
    entry: [
      { $iterate: true, id: 'id', title: 'header' },
      { $apply: 'cast_entry' },
    ],
    account: [
      { $iterate: true, id: 'id', name: 'name' },
      { $apply: 'cast_account' },
    ],
    ['cast_entry']: schemas.entry.mapping,
    ['cast_account']: schemas.account.mapping,
  },
  functions: { ...functions, ...jsonFunctions },
}

const setupService = createService({ schemas, mapOptions })

const dispatch = async (action: Action) => ({
  ...action,
  response: { ...action.response, status: 'ok' },
})

test.after.always(() => {
  nock.restore()
})

// Tests

test('should delete items from service', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/bulk_delete', {
      docs: [{ id: 'ent1' }, { id: 'ent2' }],
    })
    .reply(200, [
      { ok: true, id: 'ent1', rev: '2-000001' },
      { ok: true, id: 'ent2', rev: '2-000001' },
    ])
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE' },
        mutation: {
          $direction: 'rev',
          data: ['data.docs[]', { $apply: 'entry' }],
        },
        options: {
          uri: 'http://api1.test/database/bulk_delete',
          method: 'POST',
        },
      },
    ],
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined
  const action = {
    type: 'DELETE',
    payload: {
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent2', $type: 'entry' },
      ],
      targetService: 'entries',
    },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should delete one item from service', async (t) => {
  const scope = nock('http://api1.test')
    .delete('/database/ent1')
    .reply(200, { ok: true, id: 'ent1', rev: '000001' })
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: {
          action: 'DELETE',
          scope: 'member',
        },
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: {
          uri: 'http://api1.test/database/{{params.id}}',
          method: 'DELETE',
        },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry', targetService: 'entries' },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should infer service id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/bulk_delete')
    .reply(200, [
      { ok: true, id: 'ent1', rev: '2-000001' },
      { ok: true, id: 'ent2', rev: '2-000001' },
    ])
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE' },
        mutation: {
          $direction: 'rev',
          data: ['data.docs[', { $apply: 'entry' }],
        },
        options: {
          uri: 'http://api2.test/database/bulk_delete',
          method: 'POST',
        },
      },
    ],
  })
  const getService = (type?: string | string[], _service?: string) =>
    type === 'entry' ? src : undefined
  const action = {
    type: 'DELETE',
    payload: {
      type: 'entry',
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent2', $type: 'entry' },
      ],
    },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should return error from response', async (t) => {
  const scope = nock('http://api5.test')
    .post('/database/bulk_delete')
    .reply(404)
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        id: 'delete',
        mutation: {
          $direction: 'rev',
          data: ['data.docs[]', { $apply: 'entry' }],
        },
        options: {
          uri: 'http://api5.test/database/bulk_delete',
          method: 'POST',
        },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: {
      type: 'entry',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.response?.status, 'notfound', ret.response?.error)
  t.is(typeof ret.response?.error, 'string')
  t.falsy(ret.response?.data)
  t.true(scope.isDone())
})

test('should return noaction when nothing to delete', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        id: 'delete',
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { uri: 'http://api1.test/database/bulk_delete' },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { data: [], targetService: 'entries' },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.is(ret.response?.status, 'noaction')
})

test('should skip null values in data array', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        id: 'delete',
        mutation: { data: ['data', { $apply: 'entry' }] },
        options: { uri: 'http://api1.test/database/bulk_delete' },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { data: [null], targetService: 'entries' },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.is(ret.response?.status, 'noaction')
})

test('should only delete items the ident is authorized to', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/bulk_delete', { docs: [{ id: 'johnf' }] })
    .reply(200, [
      { ok: true, id: 'ent1', rev: '2-000001' },
      { ok: true, id: 'ent2', rev: '2-000001' },
    ])
  const src = setupService({
    id: 'accounts',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE' },
        mutation: {
          $direction: 'rev',
          data: ['data.docs[', { $apply: 'account' }],
        },
        options: {
          uri: 'http://api4.test/database/bulk_delete',
          method: 'POST',
        },
      },
    ],
  })
  const getService = (_type?: string | string[], service?: string) =>
    service === 'accounts' ? src : undefined
  const action = {
    type: 'DELETE',
    payload: {
      data: [
        { id: 'johnf', $type: 'account' },
        { id: 'betty', $type: 'account' },
      ],
      targetService: 'accounts',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.true(scope.isDone())
})

test('should return error when no service exists for a type', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry' },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, "No service exists for type 'entry'")
})

test('should return error when specified service does not exist', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry', targetService: 'entries' },
  }

  const ret = await deleteFn(action, dispatch, getService)

  t.truthy(ret)
  t.is(ret.response?.status, 'error')
  t.is(ret.response?.error, "Service with id 'entries' does not exist")
})

test('should return error if no getService', async (t) => {
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry' },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ret = await deleteFn(action, dispatch, undefined as any)

  t.is(ret.response?.status, 'error')
})