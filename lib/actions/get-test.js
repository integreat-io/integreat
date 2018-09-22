import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import createService from '../service'
import json from '../adapters/json'
import schema from '../schema'
import setupMapping from '../mapping'

import get from './get'

// Helpers

const schemas = {
  entry: schema({
    id: 'entry',
    attributes: {
      title: 'headline',
      byline: { default: 'Somebody' }
    },
    relationships: {
      service: 'service'
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
    attributes: {
      id: 'id',
      title: 'headline',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relationships: {
      service: '$params.service'
    }
  },
  {
    id: 'account',
    attributes: {
      id: 'id',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  }
]

function setupService (uri, match = {}, { id = 'entries' } = {}) {
  return createService({ schemas, mappings, setupMapping: setupMapping({ schemas }) })({
    id,
    adapter: json,
    endpoints: [
      { match, options: { uri } },
      { id: 'other', options: { uri: 'http://api5.test/other' } }
    ],
    mappings: (id === 'accounts') ? { account: 'account' } : { entry: 'entry' }
  })
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get all items from service', async (t) => {
  const date = new Date()
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{
      id: 'ent1',
      type: 'entry',
      headline: 'Entry 1',
      createdAt: date.toISOString(),
      updatedAt: date.toISOString()
    }])
  const payload = {
    type: 'entry',
    service: 'entries',
    params: { service: 'thenews' }
  }
  const ident = { id: 'johnf' }
  const src = setupService('http://api1.test/database')
  const getService = (type, service) => (service === 'entries') ? src : null
  const expected = {
    status: 'ok',
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: {
        title: 'Entry 1',
        byline: 'Somebody',
        createdAt: date,
        updatedAt: date
      },
      relationships: {
        service: { id: 'thenews', type: 'service' }
      }
    }],
    access: { status: 'granted', ident, scheme: 'data' }
  }

  const ret = await get({ payload, ident }, { getService, schemas })

  t.deepEqual(ret, expected)
})

test('should get item by id from service', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const payload = {
    id: 'ent1',
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api1.test/database/{type}:{id}')
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should get items by id array from service from member_s_ endpoint', async (t) => {
  nock('http://api12.test')
    .get('/entries')
    .query({ id: 'ent1,ent2' })
    .reply(200, [
      { id: 'ent1', type: 'entry' },
      { id: 'ent2', type: 'entry' }
    ])
  const payload = {
    id: ['ent1', 'ent2'],
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api12.test/entries{?id}', { scope: 'members' })
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
})

test('should get items by id array from service from member endpoints', async (t) => {
  nock('http://api6.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
    .get('/entries/ent2')
    .reply(200, { id: 'ent2', type: 'entry' })
  const payload = {
    id: ['ent1', 'ent2'],
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api6.test/entries/{id}', { scope: 'member' })
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[1].id, 'ent2')
})

test('should pass on ident when getting from id array', async (t) => {
  const payload = {
    id: ['ent1', 'ent2'],
    type: 'entry',
    service: 'entries'
  }
  const ident = { id: 'johnf' }
  const src = setupService('http://api11.test/entries/{id}', { scope: 'member' })
  sinon.stub(src, 'send').resolves({ response: { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] } })
  const getService = (type, service) => src

  await get({ payload, ident }, { getService, schemas })

  t.is(src.send.callCount, 2)
  const request0 = src.send.args[0][0]
  t.truthy(request0)
  t.is(request0.access.ident, ident)
})

test('should return undefined for items not found when getting by id array', async (t) => {
  nock('http://api10.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
    .get('/entries/ent2')
    .reply(404)
  const payload = {
    id: ['ent1', 'ent2'],
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api10.test/entries/{id}', { scope: 'member' })
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  t.is(ret.data[0].id, 'ent1')
  t.is(typeof ret.data[1], 'undefined')
})

test('should return error when one or more requests for individual ids fails', async (t) => {
  nock('http://api8.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
    .get('/entries/ent2')
    .reply(500)
  const payload = {
    id: ['ent1', 'ent2'],
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api8.test/entries/{id}', { scope: 'member' })
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'error')
})

test('should get item by id from service when id is array of one', async (t) => {
  nock('http://api7.test')
    .get('/entries/ent1')
    .reply(200, { id: 'ent1', type: 'entry' })
  const payload = {
    id: ['ent1'],
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api7.test/entries/{id}', { scope: 'member' })
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const payload = {
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api1.test/database')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const payload = {
    type: 'entry',
    service: 'entries',
    onlyMappedValues: true
  }
  const src = setupService('http://api1.test/database')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('should infer service id from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const payload = { type: 'entry' }
  const src = setupService('http://api1.test/database')
  const getService = (type, service) => (type === 'entry') ? src : null

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok')
  t.is(ret.data[0].id, 'ent1')
})

test('should get from other endpoint', async (t) => {
  nock('http://api5.test')
    .get('/other')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const payload = {
    type: 'entry',
    endpoint: 'other'
  }
  const src = setupService('http://api5.test/database')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data[0].id, 'ent1')
})

test('should get with uri params', async (t) => {
  nock('http://api1.test')
    .get('/database?first=20&max=10&type=entry')
    .reply(200, [{ id: 'ent1', type: 'entry' }])
  const payload = {
    type: 'entry',
    params: {
      first: 20,
      max: 10
    }
  }
  const src = setupService('http://api1.test/database{?first,max,type}')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data[0].id, 'ent1')
})

test('should return error on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const payload = {
    type: 'entry',
    service: 'entries'
  }
  const src = setupService('http://api3.test/unknown')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no getService', async (t) => {
  const payload = {
    type: 'entry',
    service: 'entries'
  }

  const ret = await get({ payload })

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = setupService('http://api4.test/unknown')
  const getService = () => src

  const ret = await get({ payload }, { getService, schemas })

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should get only authorized items', async (t) => {
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
  const payload = {
    type: 'account',
    service: 'accounts'
  }
  const ident = { id: 'johnf' }
  const src = setupService('http://api9.test/database', {}, { id: 'accounts' })
  const getService = (type, service) => (service === 'accounts') ? src : null
  const expected = {
    status: 'ok',
    data: [{
      id: 'johnf',
      type: 'account',
      attributes: {
        name: 'John F.',
        createdAt: date,
        updatedAt: date
      },
      relationships: {}
    }],
    access: { status: 'partially', ident, scheme: 'data' }
  }

  const ret = await get({ payload, ident }, { getService, schemas })

  t.deepEqual(ret, expected)
})
