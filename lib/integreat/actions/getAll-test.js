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
    type: 'GET',
    source: 'entries',
    payload: {type: 'entry'}
  }
  const src = createSource('http://api1.test/database')
  const sources = {entries: src}

  const ret = await getAll(action, sources)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('should return null on not found', async (t) => {
  t.plan(1)
  nock('http://api3.test')
    .get('/unknown')
    .reply(404)
  const action = {
    type: 'GET',
    source: 'entries'
  }
  const src = createSource('http://api3.test/unknown')
  const sources = {entries: src}

  try {
    await getAll(action, sources)
  } catch (err) {
    t.pass()
  }
})
