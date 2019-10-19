import test from 'ava'
import sinon = require('sinon')
import nock = require('nock')
import createService from '../service'
import json from 'integreat-adapter-json'
import schema from '../schema'
import functions from '../transformers/builtIns'

import get from './get'

// Setup

const schemas = {
  entry: schema({
    id: 'entry',
    shape: {
      title: 'string',
      byline: { $cast: 'string', $default: 'Somebody' },
      service: 'service'
    }
  }),
  account: schema({
    id: 'account',
    shape: {
      name: 'string'
    },
    access: { identFromField: 'id' }
  })
}

const pipelines = {
  entry: [
    {
      $iterate: true,
      id: 'id',
      title: 'headline',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      service: '^params.source'
    },
    { $apply: 'cast_entry' }
  ],
  account: [
    {
      $iterate: true,
      id: 'id',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    { $apply: 'cast_account' }
  ],
  ['cast_entry']: schemas.entry.mapping,
  ['cast_account']: schemas.account.mapping
}

const mapOptions = { pipelines, functions }

const setupService = (uri: string, match = {}, { id = 'entries' } = {}) =>
  createService({ schemas, mapOptions })({
    id,
    adapter: json,
    endpoints: [
      { match, options: { uri } },
      { id: 'other', options: { uri: 'http://api5.test/other' } }
    ],
    mappings: id === 'accounts' ? { account: 'account' } : { entry: 'entry' }
  })

const dispatch = async () => ({ status: 'ok' })

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get all items from service', async t => {
  const date = new Date()
  nock('http://api1.test')
    .get('/database')
    .reply(200, [
      {
        id: 'ent1',
        type: 'entry',
        headline: 'Entry 1',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      }
    ])
  const ident = { id: 'johnf' }
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      service: 'entries',
      source: 'thenews'
    },
    meta: { ident }
  }
  const src = setupService('http://api1.test/database')
  const getService = (_type: string, service: string) =>
    service === 'entries' ? src : null
  const expected = {
    status: 'ok',
    data: [
      {
        $type: 'entry',
        id: 'ent1',
        title: 'Entry 1',
        byline: 'Somebody',
        createdAt: date,
        updatedAt: date,
        service: { id: 'thenews', $ref: 'service' }
      }
    ],
    access: { status: 'granted', ident, scheme: 'data' }
  }

  const ret = await get(action, dispatch, getService)

  t.deepEqual(ret, expected)
})

test('should get item by id from service', async t => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api1.test/database/{type}:{id}')
  const getService = (_type: string, service: string) =>
    service === 'entries' ? src : null

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.id, 'ent1')
})

test('should get items by id array from service from member_s_ endpoint', async t => {
  nock('http://api12.test')
    .get('/entries')
    .query({ id: 'ent1,ent2' })
    .reply(200, [{ id: 'ent1', type: 'entry' }, { id: 'ent2', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1', 'ent2'],
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api12.test/entries{?id}', {
    scope: 'members'
  })
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
})

test('should get items by id array from service from member endpoints', async t => {
  nock('http://api6.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
    .get('/entries/ent2')
    .reply(200, { id: 'ent2', type: 'entry' })
    .get('/entries/ent3')
    .reply(404, undefined)
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1', 'ent2', 'ent3'],
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api6.test/entries/{id}', { scope: 'member' })
  const getService = (_type: string, service: string) =>
    service === 'entries' ? src : null

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 3)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
  t.is(ret.data[2], undefined)
})

test('should pass on ident when getting from id array', async t => {
  const ident = { id: 'johnf' }
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1', 'ent2'],
      type: 'entry',
      service: 'entries'
    },
    meta: { ident }
  }
  const src = setupService('http://api11.test/entries/{id}', {
    scope: 'member'
  })
  sinon.stub(src, 'send').resolves({
    response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
  })
  const getService = () => src

  await get(action, dispatch, getService)

  t.is(src.send.callCount, 2)
  const request0 = src.send.args[0][0]
  t.truthy(request0)
  t.is(request0.meta.ident, ident)
})

test('should return error when one or more requests for individual ids fails', async t => {
  nock('http://api8.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
    .get('/entries/ent2')
    .reply(500)
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1', 'ent2'],
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api8.test/entries/{id}', { scope: 'member' })
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'error')
})

test('should get item by id from service when id is array of one', async t => {
  nock('http://api7.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const action = {
    type: 'GET',
    payload: {
      id: ['ent1'],
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api7.test/entries/{id}', { scope: 'member' })
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.id, 'ent1')
})

test('should get default values from type', async t => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api1.test/database')
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.data[0].byline, 'Somebody')
})

test('should not get default values from type', async t => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      service: 'entries',
      onlyMappedValues: true
    }
  }
  const src = setupService('http://api1.test/database')
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.data[0].byline, undefined)
})

test('should infer service id from type', async t => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = { type: 'GET', payload: { type: 'entry' } }
  const src = setupService('http://api1.test/database')
  const getService = (type: string, _service: string) =>
    type === 'entry' ? src : null

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok')
  t.is(ret.data[0].id, 'ent1')
})

test('should get from other endpoint', async t => {
  nock('http://api5.test')
    .get('/other')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      endpoint: 'other'
    }
  }
  const src = setupService('http://api5.test/database')
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data[0].id, 'ent1')
})

test('should get with uri params', async t => {
  nock('http://api1.test')
    .get('/database?first=20&max=10&type=entry')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      first: 20,
      max: 10
    }
  }
  const src = setupService('http://api1.test/database{?first,max,type}')
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data[0].id, 'ent1')
})

test('should return error on not found', async t => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      service: 'entries'
    }
  }
  const src = setupService('http://api3.test/unknown')
  const getService = () => src

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no service exists for type', async t => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const getService = () => null

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.error, "No service exists for type 'entry'")
})

test('should return error when specified service does not exist', async t => {
  const action = { type: 'GET', payload: { service: 'entries', type: 'entry' } }
  const getService = () => null

  const ret = await get(action, dispatch, getService)

  t.is(ret.status, 'error')
  t.is(ret.error, "Service with id 'entries' does not exist")
})

test('should return error when no getService', async t => {
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      service: 'entries'
    }
  }

  const ret = await get(action)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should get only authorized items', async t => {
  const date = new Date()
  nock('http://api9.test')
    .get('/database')
    .reply(200, [
      {
        id: 'johnf',
        type: 'account',
        name: 'John F.',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      },
      {
        id: 'betty',
        type: 'account',
        name: 'Betty K.',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      }
    ])
  const ident = { id: 'johnf' }
  const action = {
    type: 'GET',
    payload: {
      type: 'account',
      service: 'accounts'
    },
    meta: { ident }
  }
  const src = setupService('http://api9.test/database', {}, { id: 'accounts' })
  const getService = (_type: string, service: string) =>
    service === 'accounts' ? src : null
  const expected = {
    status: 'ok',
    data: [
      {
        $type: 'account',
        id: 'johnf',
        name: 'John F.',
        createdAt: date,
        updatedAt: date
      }
    ],
    access: { status: 'partially', ident, scheme: 'data' }
  }

  const ret = await get(action, dispatch, getService)

  t.deepEqual(ret, expected)
})
