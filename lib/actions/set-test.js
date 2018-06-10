import test from 'ava'
import nock from 'nock'
import setupService from '../service'
import json from '../adapters/json'
import schema from '../schema'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import set from './set'

// Helpers

const schemas = {
  entry: schema({
    id: 'entry',
    attributes: {
      title: {default: 'A title'},
      one: 'integer'
    }
  }),
  account: schema({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: {identFromField: 'id'}
  })
}

const mappings = [
  setupMapping({
    type: 'entry',
    service: 'entries',
    attributes: {id: 'id', type: 'type', title: 'header'}
  }, {schemas}),
  setupMapping({
    type: 'account',
    service: 'accounts',
    attributes: {id: 'id', type: 'type', name: 'name'}
  }, {schemas})
]

const createService = (endpoint, {endpointId = null, method = 'POST', path = 'docs[]', id = 'entries'} = {}) => {
  const endpoints = [
    createEndpoint({id: endpointId, uri: endpoint, path, method}),
    createEndpoint({id: 'other', uri: 'http://api1.test/other/_bulk_docs'})
  ]
  return setupService({id, adapter: json, endpoints}, {schemas, mappings})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should map and set items to service', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', {
      docs: [
        {id: 'ent1', type: 'entry', header: 'Entry 1'},
        {id: 'ent2', type: 'entry', header: 'Entry 2'}
      ]
    })
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {
    service: 'entries',
    data: [
      {id: 'ent1', type: 'entry', attributes: {title: 'Entry 1'}},
      {id: 'ent2', type: 'entry', attributes: {title: 'Entry 2'}}
    ]
  }
  const src = createService('http://api1.test/database/_bulk_docs')
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should map and set one item to service', async (t) => {
  const scope = nock('http://api5.test')
    .put('/database/entry:ent1', {id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    data: {id: 'ent1', type: 'entry'}
  }
  const src = createService(
    'http://api5.test/database/{type}:{id}',
    {endpoint: 'setOne', method: 'PUT', path: ''}
  )
  const getService = (type, service) => (type === 'entry') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should map with default values from type', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry', header: 'A title'}]})
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {
    service: 'entries',
    data: [
      {id: 'ent1', type: 'entry'}
    ],
    useDefaults: true
  }
  const src = createService('http://api4.test/database/_bulk_docs')
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer service id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/_bulk_docs')
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {type: 'entry', data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]}
  const src = createService('http://api2.test/database/_bulk_docs')
  const getService = (type, service) => (type === 'entry') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set to specified endpoint', async (t) => {
  const scope = nock('http://api1.test')
    .put('/other/_bulk_docs')
    .reply(201, [{ok: true}])
  const payload = {endpoint: 'other', service: 'entries', data: [{id: 'ent1', type: 'entry'}]}
  const src = createService('http://api1.test/database/_bulk_docs')
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set to uri with params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/_bulk_docs')
    .reply(201, [{ok: true}])
  const payload = {params: {typefolder: 'entries'}, service: 'entries', data: [{id: 'ent1', type: 'entry'}]}
  const src = createService('http://api3.test/{typefolder}/_bulk_docs')
  const getService = (type, service) => (service === 'entries') ? src : null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error when service fails', async (t) => {
  nock('http://api7.test')
    .post('/database/_bulk_docs')
    .reply(404)
  const payload = {
    service: 'entries',
    data: [{id: 'ent1', type: 'entry'}]
  }
  const src = createService('http://api7.test/database/_bulk_docs')
  const getService = (type, service) => src

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
})

test('should return error when no payload', async (t) => {
  const src = createService('http://api1.test/database/_bulk_docs')
  const getService = () => src
  const payload = null

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no service', async (t) => {
  const getService = () => null
  const payload = {
    data: {id: 'ent1', type: 'entry'}
  }

  const ret = await set({payload}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should authenticate items', async (t) => {
  const scope = nock('http://api6.test')
    .post('/database/_bulk_docs', {
      docs: [
        {id: 'johnf', type: 'account', name: 'John F.'}
      ]
    })
    .reply(201, [{ok: true}])
  const payload = {
    service: 'accounts',
    data: [
      {id: 'johnf', type: 'account', attributes: {name: 'John F.'}},
      {id: 'betty', type: 'account', attributes: {name: 'Betty'}}
    ]
  }
  const src = createService('http://api6.test/database/_bulk_docs', {id: 'accounts'})
  const getService = (type, service) => (service === 'accounts') ? src : null
  const ident = {id: 'johnf'}

  const ret = await set({payload, ident}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set authorized data on response', async (t) => {
  nock('http://api8.test')
    .post('/database/_bulk_docs')
    .reply(201, [{ok: true}])
  const payload = {
    service: 'accounts',
    data: [
      {id: 'johnf', type: 'account', attributes: {name: 'John F.'}},
      {id: 'betty', type: 'account', attributes: {name: 'Betty'}}
    ]
  }
  const expectedData = [{
    id: 'johnf',
    type: 'account',
    attributes: {name: 'John F.'},
    relationships: {}
  }]
  const src = createService('http://api8.test/database/_bulk_docs', {id: 'accounts'})
  const getService = (type, service) => (service === 'accounts') ? src : null
  const ident = {id: 'johnf'}

  const ret = await set({payload, ident}, {getService, schemas})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expectedData)
})
