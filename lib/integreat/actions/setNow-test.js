import test from 'ava'
import nock from 'nock'
import source from '../source'
import couchdb from '../../adapters/couchdb'

import setNow from './setNow'

// Helpers

const createSources = (endpoint) => {
  const attributes = [{key: 'id'}, {key: 'type'}]
  const items = [{type: 'entry', attributes}]
  const endpoints = {send: {uri: endpoint}}
  const src = source('entries', {adapter: couchdb, items, endpoints})
  return {entries: src}
}

test.after((t) => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof setNow, 'function')
})

test('should set item to source', async (t) => {
  const scope = nock('http://api1.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const action = {
    type: 'SET_NOW',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const sources = createSources('http://api1.test/database/{type}:{id}')

  const ret = await setNow(action, {sources})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})

test('should infere source id from type', async (t) => {
  const scope = nock('http://api2.test')
    .put('/database/entry:ent1', {_id: 'ent1', type: 'entry'})
    .reply(200, {okay: true, id: 'ent1', rev: '000001'})
  const action = {
    type: 'SET_NOW',
    payload: {id: 'ent1', type: 'entry'}
  }
  const sources = createSources('http://api2.test/database/{type}:{id}')
  const types = {entry: {source: 'entries'}}

  const ret = await setNow(action, {sources, types})

  t.true(scope.isDone())
  t.truthy(ret)
  t.is(ret.status, 'ok')
})
