import test from 'ava'
import nock from 'nock'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import createService from '../service/index.js'
import createSchema from '../schema/index.js'
import transformers from '../transformers/builtIns/index.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'

import deleteFn from './delete.js'

// Setup

const schemas = {
  entry: createSchema({
    id: 'entry',
    shape: {
      title: { $type: 'string', default: 'A title' },
    },
    access: 'auth',
  }),
  account: createSchema({
    id: 'account',
    shape: {
      name: 'string',
    },
    access: { identFromField: 'id' },
  }),
}

const pipelines = {
  entry: [
    { $iterate: true, id: 'id', title: 'header' },
    { $apply: 'cast_entry' },
  ],
  account: [
    { $iterate: true, id: 'id', name: 'name' },
    { $apply: 'cast_account' },
  ],
}

const mapOptions = createMapOptions(schemas, pipelines, transformers)
const setupService = createService({ schemas, mapOptions })

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
            'payload.data': ['payload.data.docs[]', { $apply: 'entry' }],
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
  const scope = nock('http://api2.test')
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
            'payload.data': ['payload.data.doc', { $apply: 'entry' }],
            'response.data': { $value: null }, // Just remove response data now, so we don't have to expect it all
          },
        ],
        options: {
          uri: 'http://api2.test/database/bulk_delete',
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
    meta: { ident: { id: 'johnf' } },
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

test('should infer service id from type', async (t) => {
  const scope = nock('http://api3.test')
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
          'payload.data': ['payload.data.docs[]', { $apply: 'entry' }],
        },
        options: {
          uri: 'http://api3.test/database/bulk_delete',
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

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.true(scope.isDone())
})

test('should return noaction when nothing to delete', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        id: 'delete',
        mutation: { 'payload.data': ['payload.data', { $apply: 'entry' }] },
        options: { uri: 'http://api1.test/database/bulk_delete' },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { data: [], targetService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaction', ret.error)
})

test('should skip null values in data array', async (t) => {
  const src = setupService({
    id: 'entries',
    ...jsonServiceDef,
    endpoints: [
      {
        id: 'delete',
        mutation: { 'payload.data': ['payload.data', { $apply: 'entry' }] },
        options: { uri: 'http://api1.test/database/bulk_delete' },
      },
    ],
  })
  const getService = () => src
  const action = {
    type: 'DELETE',
    payload: { data: [null], targetService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.is(ret.status, 'noaction', ret.error)
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
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'error', ret.error)
  t.is(ret.error, "No service exists for type 'entry'")
})

test('should return error when specified service does not exist', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'DELETE',
    payload: { id: 'ent1', type: 'entry', targetService: 'entries' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.truthy(ret)
  t.is(ret.status, 'error', ret.error)
  t.is(ret.error, "Service with id 'entries' does not exist")
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

  const ret = await deleteFn(action, { ...handlerResources, getService })

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})
