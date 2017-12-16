import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'
import source from '../source'
import json from '../../adapters/json'
import datatype from '../datatype'

import get from './get'

// Helpers

function createSource (endpoint, endpointId = 'get') {
  const endpoints = {[endpointId]: {uri: endpoint}, other: {uri: 'http://api1.test/other'}}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  const datatypes = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  return source({id: 'entries', adapter: json, endpoints, mappings}, {datatypes})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof get, 'function')
})

test('should get all items from source', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should get item by id from source', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database/{type}:{id}', 'getOne')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'ok', ret.error)
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries',
    useDefaults: false
  }
  const src = createSource('http://api1.test/database')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('should infer source id from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {type: 'entry'}
  const src = createSource('http://api1.test/database')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'ok')
  t.is(ret.data[0].id, 'ent1')
})

test('should get from other endpoint', async (t) => {
  nock('http://api1.test')
    .get('/other')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    endpoint: 'other'
  }
  const src = createSource('http://api1.test/database')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data[0].id, 'ent1')
})

test('should get with uri params', async (t) => {
  nock('http://api1.test')
    .get('/database?first=20&max=10&type=entry')
    .reply(200, [{id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    params: {
      first: 20,
      max: 10
    }
  }
  const src = createSource('http://api1.test/database{?first,max,type}')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'ok')
  t.is(ret.data[0].id, 'ent1')
})

test('should return error on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const payload = {
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api3.test/unknown')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no getSource', async (t) => {
  const payload = {
    type: 'entry',
    source: 'entries'
  }

  const ret = await get(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource('http://api4.test/unknown')
  const getSource = () => src

  const ret = await get(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should call retrieve with params object', async (t) => {
  const src = createSource('http://api1.test/database')
  const getSource = (type, source) => (source === 'entries') ? src : null
  sinon.stub(src, 'retrieve').resolves({status: 'ok', data: {}})
  const payload = {
    type: 'entry',
    source: 'entries',
    params: {view: 'entries_expired'}
  }

  await get(payload, {getSource})

  t.is(src.retrieve.callCount, 1)
  const {params} = src.retrieve.args[0][0]
  t.truthy(params)
  t.is(params.type, 'entry')
  t.is(params.source, 'entries')
  t.is(params.view, 'entries_expired')
})
