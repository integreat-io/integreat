import test from 'ava'
import nock from 'nock'
import setupSource from '../source'
import json from '../adapters/json'
import datatype from '../datatype'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import set from './set'

// Helpers

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      title: {default: 'A title'},
      one: 'integer'
    }
  })
}

const mappings = [setupMapping({
  type: 'entry',
  source: 'entries',
  attributes: {id: 'id', type: 'type', title: 'header'}
}, {datatypes})]

const createSource = (endpoint, endpointId = null, method = 'POST', path = 'docs[]') => {
  const endpoints = [
    createEndpoint({id: endpointId, uri: endpoint, path, method}),
    createEndpoint({id: 'other', uri: 'http://api1.test/other/_bulk_docs'})
  ]
  return setupSource({id: 'entries', adapter: json, endpoints}, {datatypes, mappings})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should map and set items to source', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', {
      docs: [
        {id: 'ent1', type: 'entry', header: 'Entry 1'},
        {id: 'ent2', type: 'entry', header: 'Entry 2'}
      ]
    })
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {
    source: 'entries',
    data: [
      {id: 'ent1', type: 'entry', attributes: {title: 'Entry 1'}},
      {id: 'ent2', type: 'entry', attributes: {title: 'Entry 2'}}
    ]
  }
  const src = createSource('http://api1.test/database/_bulk_docs')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should map and set one item to source', async (t) => {
  const scope = nock('http://api5.test')
    .put('/database/entry:ent1', {id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    data: {id: 'ent1', type: 'entry'}
  }
  const src = createSource('http://api5.test/database/{type}:{id}', 'setOne', 'PUT', '')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should map with default values from type', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry', header: 'A title'}]})
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {
    source: 'entries',
    data: [
      {id: 'ent1', type: 'entry'}
    ],
    useDefaults: true
  }
  const src = createSource('http://api4.test/database/_bulk_docs')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/_bulk_docs')
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {type: 'entry', data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]}
  const src = createSource('http://api2.test/database/_bulk_docs')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set to specified endpoint', async (t) => {
  const scope = nock('http://api1.test')
    .put('/other/_bulk_docs')
    .reply(201, [{ok: true}])
  const payload = {endpoint: 'other', source: 'entries', data: [{id: 'ent1', type: 'entry'}]}
  const src = createSource('http://api1.test/database/_bulk_docs')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set to uri with params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/_bulk_docs')
    .reply(201, [{ok: true}])
  const payload = {params: {typefolder: 'entries'}, source: 'entries', data: [{id: 'ent1', type: 'entry'}]}
  const src = createSource('http://api3.test/{typefolder}/_bulk_docs')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error when no payload', async (t) => {
  const src = createSource('http://api1.test/database/_bulk_docs')
  const getSource = () => src
  const payload = null

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error when no source', async (t) => {
  const getSource = () => null
  const payload = {
    data: {id: 'ent1', type: 'entry'}
  }

  const ret = await set(payload, {getSource, datatypes})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
