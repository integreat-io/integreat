import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'
import datatype from '../datatype'

import getOne from './getOne'

// Helpers

function createSource (endpoint) {
  const endpoints = {getOne: {uri: endpoint}, other: {uri: 'http://api1.test/other/{type}:{id}'}}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  const datatypes = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  return source({id: 'entries', adapter: couchdb, endpoints, mappings}, {datatypes})
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof getOne, 'function')
})

test('should get item from source', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = (type, source) => (source === 'entries') ? src : null

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok', ret.error)
  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
  t.is(ret.data.type, 'entry')
})

test('should get first item when several is returned', async (t) => {
  nock('http://api3.test')
    .get('/database/entry:ent1')
    .reply(200, [{_id: 'ent1', type: 'entry'}, {_id: 'ent2', type: 'entry'}])
  const payload = {
    id: 'ent1',
    type: 'entry'
  }
  const src = createSource('http://api3.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data)
  t.is(ret.data.id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data.attributes)
  t.is(ret.data.attributes.byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries',
    mappedValuesOnly: true
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret.data.attributes)
  t.is(ret.data.attributes.byline, undefined)
})

test('should infer source from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {id: 'ent1', type: 'entry'}
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = (type, source) => (type === 'entry') ? src : null

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok')
  t.is(ret.data.id, 'ent1')
})

test('should get from other endpoint', async (t) => {
  nock('http://api1.test')
    .get('/other/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    endpoint: 'other'
  }
  const src = createSource('http://api1.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok')
  t.is(ret.data.id, 'ent1')
})

test('should get with uri params', async (t) => {
  nock('http://api1.test')
    .get('/entries/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {
    id: 'ent1',
    type: 'entry',
    params: {
      typefolder: 'entries'
    }
  }
  const src = createSource('http://api1.test/{typefolder}/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'ok')
  t.is(ret.data.id, 'ent1')
})

test('should return error when item is not found', async (t) => {
  nock('http://api2.test')
    .get('/database/entry:unknown')
    .reply(404)
  const payload = {
    id: 'unknown',
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api2.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.is(ret.status, 'notfound')
})

test('should return error when no getSource', async (t) => {
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }

  const ret = await getOne(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const src = createSource('http://api3.test/database/{type}:{id}')
  const getSource = () => src

  const ret = await getOne(payload, {getSource})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
