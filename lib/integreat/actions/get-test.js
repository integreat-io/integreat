import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'
import datatype from '../datatype'

import get from './get'

// Helpers

function createSource (endpoint, {types = {}} = {}) {
  const endpoints = {one: {uri: endpoint}}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  return source({id: 'entries', adapter: couchdb, endpoints, mappings}, {types})
}

// Tests

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof get, 'function')
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
  const sources = {entries: src}

  const ret = await get(payload, {sources})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
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
  const types = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  const src = createSource('http://api1.test/database/{type}:{id}', {types})
  const sources = {entries: src}

  const ret = await get(payload, {sources, types})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
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
  const types = {entry: datatype({
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  })}
  const src = createSource('http://api1.test/database/{type}:{id}', {types})
  const sources = {entries: src}

  const ret = await get(payload, {sources, types})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('should infer source from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {id: 'ent1', type: 'entry'}
  const src = createSource('http://api1.test/database/{type}:{id}')
  const sources = {entries: src}
  const types = {entry: datatype({source: 'entries'})}

  const ret = await get(payload, {sources, types})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
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
  const sources = {entries: src}

  const ret = await get(payload, {sources})

  t.is(ret.status, 'notfound')
})

test('should return error when no sources', async (t) => {
  const payload = {
    id: 'ent1',
    type: 'entry',
    source: 'entries'
  }

  const ret = await get(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const sources = {}

  const ret = await get(payload, {sources})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
