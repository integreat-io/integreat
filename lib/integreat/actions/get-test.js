import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import get from './get'

// Helpers

function createSource (endpoint) {
  const endpoints = {one: {uri: endpoint}}
  const attributes = [{key: 'id'}]
  const items = [{type: 'entry', attributes}]
  return source('entries', {adapter: couchdb, endpoints, items})
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

test('should infere source from type', async (t) => {
  nock('http://api1.test')
    .get('/database/entry:ent1')
    .reply(200, {_id: 'ent1', type: 'entry'})
  const payload = {id: 'ent1', type: 'entry'}
  const src = createSource('http://api1.test/database/{type}:{id}')
  const sources = {entries: src}
  const types = {entry: {source: 'entries'}}

  const ret = await get(payload, {sources, types})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should return error object when item is not found', async (t) => {
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
