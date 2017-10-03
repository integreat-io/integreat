import test from 'ava'
import nock from 'nock'
import json from '../../adapters/json'
import source from '../source'
import datatype from '../datatype'

import deleteFn from './delete'

// Helpers
const datatypes = {entry: datatype({id: 'entry', attributes: {type: 'string', title: {default: 'A title'}}})}
const mappings = {entry: {type: 'entry', attributes: {id: 'id', type: 'type'}}}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof deleteFn, 'function')
})

test('should delete item from source', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]})
      .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = {delete: {
    uri: 'http://api1.test/database/_bulk_docs',
    path: 'docs[]'
  }}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}],
    source: 'entries'
  }

  const ret = await deleteFn(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/_bulk_docs', {docs: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}]})
      .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = {delete: {
    uri: 'http://api2.test/database/_bulk_docs',
    path: 'docs[]'
  }}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => (type === 'entry') ? src : null
  const payload = {
    data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}],
    type: 'entry'
  }

  const ret = await deleteFn(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete with other endpoint and uri params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/_bulk_docs', [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}])
      .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = {other: {uri: 'http://api3.test/{typefolder}/_bulk_docs'}}
  const src = source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
  const getSource = (type, source) => src
  const payload = {
    data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}],
    type: 'entry',
    endpoint: 'other',
    params: {typefolder: 'entries'}
  }

  const ret = await deleteFn(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error if no getSource', async (t) => {
  const payload = {id: 'ent1', type: 'entry'}

  const ret = await deleteFn(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = source({id: 'entries', adapter: json}, {datatypes})
  const getSource = () => src

  const ret = await deleteFn(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
