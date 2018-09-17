import test from 'ava'
import nock from 'nock'
import json from '../adapters/json'
import createService from '../service'
import schema from '../schema'
import createMapping from '../mapping'

import deleteFn from './delete'

// Helpers

const schemas = {
  entry: schema({
    id: 'entry',
    attributes: {
      type: 'string',
      title: { default: 'A title' }
    }
  }),
  account: schema({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: { identFromField: 'id' }
  })
}

const mappings = [
  {
    id: 'entry',
    attributes: { id: 'id', title: 'header' }
  },
  {
    id: 'account',
    attributes: { id: 'id', name: 'name' }
  }
]

const setupMapping = createMapping({ schemas })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should delete items from service', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/bulk_delete', { docs: [{ id: 'ent1' }, { id: 'ent2' }] })
    .reply(200, [{ ok: true, id: 'ent1', rev: '2-000001' }, { ok: true, id: 'ent2', rev: '2-000001' }])
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      match: { action: 'DELETE' },
      options: {
        uri: 'http://api1.test/database/bulk_delete',
        path: 'docs[]',
        method: 'POST'
      }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => (service === 'entries') ? src : null
  const payload = {
    data: [
      { id: 'ent1', type: 'entry' },
      { id: 'ent2', type: 'entry' }
    ],
    service: 'entries'
  }
  const expected = { status: 'ok' }

  const ret = await deleteFn({ payload }, { getService })

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should delete one item from service', async (t) => {
  const scope = nock('http://api1.test')
    .delete('/database/ent1')
    .reply(200, { ok: true, id: 'ent1', rev: '000001' })
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      match: {
        action: 'DELETE',
        scope: 'member'
      },
      options: {
        uri: 'http://api1.test/database/{id}',
        method: 'DELETE'
      }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => (service === 'entries') ? src : null
  const payload = { id: 'ent1', type: 'entry', service: 'entries' }

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer service id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/bulk_delete', { docs: [{ id: 'ent1' }, { id: 'ent2' }] })
    .reply(200, [{ ok: true, id: 'ent1', rev: '2-000001' }, { ok: true, id: 'ent2', rev: '2-000001' }])
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      match: { action: 'DELETE' },
      options: {
        uri: 'http://api2.test/database/bulk_delete',
        path: 'docs[]',
        method: 'POST'
      }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => (type === 'entry') ? src : null
  const payload = {
    data: [{ id: 'ent1', type: 'entry' }, { id: 'ent2', type: 'entry' }],
    type: 'entry'
  }

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete with other endpoint and uri params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/bulk_delete', [{ id: 'ent1' }, { id: 'ent2' }])
    .reply(200, [{ ok: true, id: 'ent1', rev: '2-000001' }, { ok: true, id: 'ent2', rev: '2-000001' }])
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      id: 'other',
      options: {
        uri: 'http://api3.test/{typefolder}/bulk_delete',
        method: 'POST'
      }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => src
  const payload = {
    data: [{ id: 'ent1', type: 'entry' }, { id: 'ent2', type: 'entry' }],
    type: 'entry',
    endpoint: 'other',
    params: { typefolder: 'entries' }
  }

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error from response', async (t) => {
  const scope = nock('http://api5.test')
    .post('/database/bulk_delete')
    .reply(404)
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      id: 'delete',
      options: {
        uri: 'http://api5.test/database/bulk_delete',
        path: 'docs[]',
        method: 'POST'
      }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => src
  const payload = {
    data: [{ id: 'ent1', type: 'entry' }],
    type: 'entry'
  }

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.true(scope.isDone())
})

test('should return noaction when nothing to delete', async (t) => {
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      id: 'delete',
      options: { uri: 'http://api1.test/database/bulk_delete' }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => src
  const payload = { data: [], service: 'entries' }

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should skip null values in data array', async (t) => {
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json,
    endpoints: [{
      id: 'delete',
      options: { uri: 'http://api1.test/database/bulk_delete' }
    }],
    mappings: { entry: 'entry' }
  })
  const getService = (type, service) => src
  const payload = { data: [null], service: 'entries' }

  const ret = await deleteFn({ payload }, { getService })

  t.is(ret.status, 'noaction')
})

test('should only delete items the ident is authorized to', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/bulk_delete', { docs: [{ id: 'johnf' }] })
    .reply(200, [{ ok: true, id: 'ent1', rev: '2-000001' }, { ok: true, id: 'ent2', rev: '2-000001' }])
  const src = createService({ mappings, setupMapping })({
    id: 'accounts',
    adapter: json,
    endpoints: [{
      match: { action: 'DELETE' },
      options: {
        uri: 'http://api4.test/database/bulk_delete',
        path: 'docs[]',
        method: 'POST'
      }
    }],
    mappings: { account: 'account' }
  })
  const getService = (type, service) => (service === 'accounts') ? src : null
  const payload = {
    data: [
      { id: 'johnf', type: 'account' },
      { id: 'betty', type: 'account' }
    ],
    service: 'accounts'
  }
  const ident = { id: 'johnf' }

  const ret = await deleteFn({ payload, ident }, { getService })

  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error if no getService', async (t) => {
  const payload = { id: 'ent1', type: 'entry' }

  const ret = await deleteFn({ payload })

  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createService({ mappings, setupMapping })({
    id: 'entries',
    adapter: json
  })
  const getService = () => src

  const ret = await deleteFn({ payload }, { getService })

  t.truthy(ret)
  t.is(ret.status, 'error')
})
