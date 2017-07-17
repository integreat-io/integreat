import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import set from './set'

// Helpers

const createSources = (endpoint) => {
  const attributes = [{key: 'id'}, {key: 'type'}]
  const mappings = {entry: {type: 'entry', attributes}}
  const endpoints = {send: {uri: endpoint}}
  const src = source('entries', {adapter: couchdb, mappings, endpoints})
  return {entries: src}
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should set item to source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {
    source: 'entries',
    data: {id: 'ent1', type: 'entry'}
  }
  const sources = createSources('http://api1.test/database/{type}:{id}')

  const ret = await set(payload, {sources})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})

test('should infere source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const payload = {data: {id: 'ent1', type: 'entry'}}
  const sources = createSources('http://api2.test/database/{type}:{id}')
  const types = {entry: {source: 'entries'}}

  const ret = await set(payload, {sources, types})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})

test('should return error if no sources', async (t) => {
  const payload = {
    source: 'entries',
    data: {id: 'ent1', type: 'entry'}
  }

  const ret = await set(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const sources = createSources('http://api1.test/database/{type}:{id}')

  const ret = await set(payload, {sources})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
