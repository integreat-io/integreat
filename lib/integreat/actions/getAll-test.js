import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import getAll from './getAll'

// Helpers

function createSource (endpoint, {types = {}} = {}) {
  const endpoints = {all: {uri: endpoint}}
  const attributes = {id: {}}
  const mappings = {entry: {type: 'entry', attributes}}
  return source({id: 'entries', adapter: couchdb, endpoints, mappings}, {types})
}

// Tests

test.after((t) => {
  nock.restore()
})

test('should exist', (t) => {
  t.is(typeof getAll, 'function')
})

test('should get all items from source', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries'
  }
  const src = createSource('http://api1.test/database')
  const sources = {entries: src}

  const ret = await getAll(payload, {sources})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries'
  }
  const types = {entry: {
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  }}
  const src = createSource('http://api1.test/database', {types})
  const sources = {entries: src}

  const ret = await getAll(payload, {sources})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('should not get default values from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const payload = {
    type: 'entry',
    source: 'entries',
    mappedValuesOnly: true
  }
  const types = {entry: {
    id: 'entry',
    attributes: {byline: {default: 'Somebody'}}
  }}
  const src = createSource('http://api1.test/database', {types})
  const sources = {entries: src}

  const ret = await getAll(payload, {sources})

  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('should infere source id from type', async (t) => {
  nock('http://api1.test')
    .get('/database')
    .reply(200, [{_id: 'ent1', type: 'entry'}])
  const payload = {type: 'entry'}
  const src = createSource('http://api1.test/database')
  const sources = {entries: src}
  const types = {entry: {source: 'entries'}}

  const ret = await getAll(payload, {sources, types})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
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
  const sources = {entries: src}

  const ret = await getAll(payload, {sources})

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})

test('should return error when no sources', async (t) => {
  const payload = {
    type: 'entry',
    source: 'entries'
  }

  const ret = await getAll(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const sources = {}

  const ret = await getAll(payload, {sources})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
