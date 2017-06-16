import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import getAll from './getAll'

// Helpers

function createSource (endpoint) {
  const endpoints = {all: {uri: endpoint}}
  const attributes = [{key: 'id'}]
  const items = [{type: 'entry', attributes}]
  return source('entries', {adapter: couchdb, endpoints, items})
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
  const action = {
    type: 'GET_ALL',
    source: 'entries',
    payload: {type: 'entry'}
  }
  const src = createSource('http://api1.test/database')
  const sources = {entries: src}

  const ret = await getAll(action, sources)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('should return error object on not found', async (t) => {
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const action = {
    type: 'GET_ALL',
    source: 'entries',
    payload: {type: 'entry'}
  }
  const src = createSource('http://api3.test/unknown')
  const sources = {entries: src}

  const ret = await getAll(action, sources)

  t.is(ret.status, 'notfound')
  t.is(ret.data, undefined)
  t.is(typeof ret.error, 'string')
})
