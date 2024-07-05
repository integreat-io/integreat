import test from 'ava'
import nock from 'nock'
import mapTransform from 'map-transform'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import Service from '../service/Service.js'
import Schema from '../schema/Schema.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { ServiceDef } from '../service/types.js'

import deleteFn from './delete.js'

// Setup

const schemas = new Map()
schemas.set(
  'entry',
  new Schema({
    id: 'entry',
    shape: {
      title: { $type: 'string', default: 'A title' },
    },
    access: 'auth',
  }),
)
schemas.set(
  'account',
  new Schema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
)

const pipelines = {
  entry: [{ $iterate: true, id: 'id', title: 'header' }, { $cast: 'entry' }],
  account: [{ $iterate: true, id: 'id', name: 'name' }, { $cast: 'account' }],
}

const mapOptions = createMapOptions(schemas, pipelines)
const setupService = (defs: ServiceDef) =>
  new Service(defs, { schemas, mapTransform, mapOptions })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should delete items from service', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/bulk_delete', {
      docs: [
        { id: 'ent1', header: 'A title' }, // Default values are included and must be handled in mutation
        { id: 'ent2', header: 'A title' },
      ],
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
        mutation: [
          {
            $direction: 'to',
            'payload.data': ['payload.data.docs[]', { $apply: 'entry' }],
          },
          {
            $direction: 'from',
            'response.data': { $value: null }, // Just remove response data now, so we don't have to expect it all
          },
        ],
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
    meta: { ident: { id: 'johnf' } },
  }
  const expected = { status: 'ok', data: null }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should delete one item from service', async (t) => {
  const scope = nock('http://api3.test')
    .post('/database/bulk_delete', {
      doc: { id: 'ent1', header: 'A title' },
    })
    .reply(200, { ok: true, id: 'ent1', rev: '2-000001' })
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE' },
        mutation: [
          {
            $direction: 'to',
            'payload.data': ['payload.data.doc', { $apply: 'entry' }],
          },
          {
            $direction: 'from',
            'response.data': { $value: null }, // Just remove response data now, so we don't have to expect it all
          },
        ],
        options: {
          uri: 'http://api3.test/database/bulk_delete',
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
      data: { id: 'ent1', $type: 'entry' },
      targetService: 'entries',
    },
  }
  const expected = { status: 'ok', data: null }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should delete item from service given by id', async (t) => {
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
        mutation: {
          payload: 'payload',
          'payload.data': ['payload.data', { $apply: 'entry' }],
        },
        allowRawResponse: true,
        options: {
          uri: 'http://api1.test/database/{payload.id}',
          method: 'DELETE',
        },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry', targetService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete items from service with params', async (t) => {
  const scope = nock('http://api7.test')
    .post('/database/delete')
    .query({ expire: '2023-11-05T01:28:47.000Z' })
    .reply(200, { deleted: 2 })
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE', params: { expiredAfter: true } },
        mutation: [
          {
            $direction: 'to',
            $flip: true,
            meta: 'meta',
            'meta.options.queryParams.expire': 'payload.expiredAfter',
          },
        ],
        allowRawResponse: true,
        options: {
          uri: 'http://api7.test/database/delete',
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
      type: 'entry',
      expiredAfter: new Date('2023-11-05T01:28:47Z'),
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: { deleted: 2 },
    headers: { 'content-type': 'application/json' },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
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
          'payload.data': ['payload.data.docs[', { $apply: 'entry' }],
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
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
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
          'payload.data': ['payload.data.docs[]', { $apply: 'entry' }],
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
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'notfound',
    data: undefined,
    error: 'Could not find the url http://api5.test/database/bulk_delete',
    origin: 'service:entries',
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
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
          'payload.data': ['payload.data.docs[', { $apply: 'account' }],
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

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return failResponse when validation fails', async (t) => {
  const scope = nock('http://api6.test')
    .post('/database/bulk_delete', {
      docs: [
        { id: 'ent1', header: 'A title' }, // Default values are included and must be handled in mutation
        { id: 'ent2', header: 'A title' },
      ],
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
        validate: [
          {
            condition: 'payload.source',
            failResponse: { status: 'badrequest', error: 'We need a source!' },
          },
        ],
        mutation: [
          { 'payload.data': ['payload.data.docs[]', { $apply: 'entry' }] },
        ],
        options: {
          uri: 'http://api6.test/database/bulk_delete',
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
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'badrequest',
    error: 'We need a source!',
    data: undefined,
    origin: 'validate:service:entries:endpoint',
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.false(scope.isDone())
})

test('should authorize before running validation', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        match: { action: 'DELETE' },
        validate: [
          {
            condition: 'payload.source',
            failResponse: { status: 'badrequest', error: 'We need a source!' },
          },
        ],
        mutation: [
          { 'payload.data': ['payload.data.docs[]', { $apply: 'entry' }] },
        ],
        options: {
          uri: 'http://api6.test/database/bulk_delete',
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
      type: 'entry',
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent2', $type: 'entry' },
      ],
      targetService: 'entries',
    },
    meta: {}, // No ident
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaccess', ret.error) // We'll get this status when authorization is run before validation
})

test('should return error when no service exists for a type', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry' },
  }
  const expected = {
    status: 'error',
    error: "No service exists for type 'entry'",
    origin: 'handler:DELETE',
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return error when specified service does not exist', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry', targetService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: "Service with id 'entries' does not exist",
    origin: 'handler:DELETE',
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return badrequest when no endpoint matches', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [], // No endpoints, so none will match
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
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'badrequest',
    error: "No endpoint matching DELETE request to service 'entries'.",
    origin: 'handler:DELETE',
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})
