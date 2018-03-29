import test from 'ava'
import nock from 'nock'
import json from '../adapters/json'
import source from '../source'
import datatype from '../datatype'
import createEndpoint from '../../tests/helpers/createEndpoint'
import createMapping from '../mapping'

import deleteFn from './delete'

// Helpers

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      type: 'string',
      title: {default: 'A title'}
    }
  }),
  account: datatype({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: {identFromField: 'id'}
  })
}

const mappings = [
  createMapping({
    type: 'entry',
    source: 'entries',
    attributes: {id: 'id', title: 'header'}
  }, {datatypes}),
  createMapping({
    type: 'account',
    source: 'accounts',
    attributes: {id: 'id', name: 'name'}
  }, {datatypes})
]
test.after.always(() => {
  nock.restore()
})

// Tests

test('should delete items from source', async (t) => {
  const scope = nock('http://api1.test')
    .post('/database/bulk_delete', {docs: [{id: 'ent1'}, {id: 'ent2'}]})
    .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = [createEndpoint({
    action: 'DELETE',
    uri: 'http://api1.test/database/bulk_delete',
    path: 'docs[]',
    method: 'POST'
  })]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {
    data: [
      {id: 'ent1', type: 'entry'},
      {id: 'ent2', type: 'entry'}
    ],
    source: 'entries'
  }
  const expected = {status: 'ok'}

  const ret = await deleteFn({payload}, {getSource})

  t.deepEqual(ret, expected)
  t.true(scope.isDone())
})

test('should delete one item from source', async (t) => {
  const scope = nock('http://api1.test')
    .delete('/database/ent1')
    .reply(200, {ok: true, id: 'ent1', rev: '000001'})
  const endpoints = [createEndpoint({
    action: 'DELETE',
    scope: 'member',
    uri: 'http://api1.test/database/{id}',
    method: 'DELETE'
  })]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => (source === 'entries') ? src : null
  const payload = {id: 'ent1', type: 'entry', source: 'entries'}

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should infer source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .post('/database/bulk_delete', {docs: [{id: 'ent1'}, {id: 'ent2'}]})
    .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = [createEndpoint({
    action: 'DELETE',
    uri: 'http://api2.test/database/bulk_delete',
    path: 'docs[]',
    method: 'POST'
  })]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => (type === 'entry') ? src : null
  const payload = {
    data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}],
    type: 'entry'
  }

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should delete with other endpoint and uri params', async (t) => {
  const scope = nock('http://api3.test')
    .post('/entries/bulk_delete', [{id: 'ent1'}, {id: 'ent2'}])
    .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = [createEndpoint({
    id: 'other',
    uri: 'http://api3.test/{typefolder}/bulk_delete',
    method: 'POST'
  })]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => src
  const payload = {
    data: [{id: 'ent1', type: 'entry'}, {id: 'ent2', type: 'entry'}],
    type: 'entry',
    endpoint: 'other',
    params: {typefolder: 'entries'}
  }

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error from response', async (t) => {
  const scope = nock('http://api5.test')
    .post('/database/bulk_delete')
    .reply(404)
  const endpoints = [createEndpoint({
    id: 'delete',
    uri: 'http://api5.test/database/bulk_delete',
    path: 'docs[]',
    method: 'POST'
  })]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => src
  const payload = {
    data: [{id: 'ent1', type: 'entry'}],
    type: 'entry'
  }

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
  t.true(scope.isDone())
})

test('should return noaction when nothing to delete', async (t) => {
  const endpoints = [createEndpoint({id: 'delete', uri: 'http://api1.test/database/bulk_delete'})]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => src
  const payload = {data: [], source: 'entries'}

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should skip null values in data array', async (t) => {
  const endpoints = [createEndpoint({id: 'delete', uri: 'http://api1.test/database/bulk_delete'})]
  const src = source({id: 'entries', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => src
  const payload = {data: [null], source: 'entries'}

  const ret = await deleteFn({payload}, {getSource})

  t.is(ret.status, 'noaction')
})

test('should delete items from source', async (t) => {
  const scope = nock('http://api4.test')
    .post('/database/bulk_delete', {docs: [{id: 'johnf'}]})
    .reply(200, [{ok: true, id: 'ent1', rev: '2-000001'}, {ok: true, id: 'ent2', rev: '2-000001'}])
  const endpoints = [createEndpoint({
    action: 'DELETE',
    uri: 'http://api4.test/database/bulk_delete',
    path: 'docs[]',
    method: 'POST'
  })]
  const src = source({id: 'accounts', adapter: json, endpoints}, {mappings})
  const getSource = (type, source) => (source === 'accounts') ? src : null
  const payload = {
    data: [
      {id: 'johnf', type: 'account'},
      {id: 'betty', type: 'account'}
    ],
    source: 'accounts'
  }
  const ident = {id: 'johnf'}

  const ret = await deleteFn({payload, ident}, {getSource})

  t.is(ret.status, 'ok', ret.error)
  t.true(scope.isDone())
})

test('should return error if no getSource', async (t) => {
  const payload = {id: 'ent1', type: 'entry'}

  const ret = await deleteFn({payload})

  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = source({id: 'entries', adapter: json}, {mappings})
  const getSource = () => src

  const ret = await deleteFn({payload}, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
