import test from 'ava'
import nock from 'nock'
import source from '../source'
import json from '../../adapters/json'
import datatype from '../datatype'

import set from './set'

// Helpers

const createSource = (endpoint) => {
  const attributes = {id: 'id', type: 'type', title: 'attributes.title'}
  const mappings = {entry: {type: 'entry', attributes}}
  const datatypes = {entry: datatype({id: 'entry', attributes: {type: 'string', title: {default: 'A title'}}})}
  const endpoints = {
    set: {uri: endpoint, path: 'docs[]', method: 'POST'},
    other: {uri: 'http://api1.test/other/_bulk_docs'}
  }
  return source({id: 'entries', adapter: json, mappings, endpoints}, {datatypes})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should set items to source', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]})
    .reply(201, [{ok: true}, {ok: true}])
  const payload = {
    source: 'entries',
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent2', type: 'entry'}
    ]
  }
  const src = createSource('http://api1.test/database/_bulk_docs')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await set(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should set default values from type', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry', attributes: {title: 'A title'}}]})
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

  const ret = await set(payload, {getSource})

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

  const ret = await set(payload, {getSource})

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

  const ret = await set(payload, {getSource})

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

  const ret = await set(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error if no getSource', async (t) => {
  const payload = {
    source: 'entries',
    data: [{id: 'ent1', type: 'entry'}]
  }

  const ret = await set(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const src = createSource('http://api1.test/database/_bulk_docs')
  const getSource = () => src
  const payload = null

  const ret = await set(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
